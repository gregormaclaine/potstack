import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import {
  createNotification,
  deleteSessionInviteReceivedNotification,
} from "@/lib/createNotification";
import type { PlayerMapping } from "@/types";
import { captureEvent } from "@/lib/posthog";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;

  const invite = await prisma.sessionInvite.findUnique({
    where: { id: Number(id) },
    select: {
      inviteeId: true,
      sessionPlayerId: true,
      session: {
        select: {
          date: true,
          location: true,
          notes: true,
          buyIn: true,
          cashOut: true,
          profit: true,
          user: { select: { username: true } },
          players: {
            select: {
              id: true,
              buyIn: true,
              cashOut: true,
              profit: true,
              player: { select: { name: true } },
            },
            orderBy: { player: { name: "asc" } },
          },
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.inviteeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { session: src } = invite;

  return NextResponse.json({
    date: src.date.toISOString(),
    location: src.location,
    notes: src.notes,
    inviterUsername: src.user.username,
    inviterBuyIn: src.buyIn,
    inviterCashOut: src.cashOut,
    inviterProfit: src.profit,
    players: src.players.map((sp) => ({
      name: sp.player.name,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
      isYou: sp.id === invite.sessionPlayerId,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const body: { action: "accept" | "reject" | "overwrite"; playerMappings?: PlayerMapping[]; existingSessionId?: number } =
    await request.json();

  const invite = await prisma.sessionInvite.findUnique({
    where: { id: Number(id) },
    include: {
      session: { include: { players: true, user: { select: { username: true } } } },
      sessionPlayer: true,
      link: { select: { id: true, ownerPlayerId: true, linkedPlayerId: true, ownerUserId: true } },
      invitee: { select: { username: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.inviteeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
  }

  if (body.action === "reject") {
    await prisma.sessionInvite.update({
      where: { id: Number(id) },
      data: { status: "REJECTED" },
    });

    const sessionDate     = invite.session.date.toISOString();
    const sessionLocation = invite.session.location;
    const sessionOwnerUsername = invite.session.user.username;
    const inviteeUsername = invite.invitee.username;

    await Promise.all([
      deleteSessionInviteReceivedNotification(invite.id, userId),
      createNotification({
        userId,
        sessionId: invite.sessionId,
        data: { type: "session_invite_rejected_by_me", otherUsername: sessionOwnerUsername, sessionDate, sessionLocation },
      }),
      createNotification({
        userId: invite.session.userId,
        sessionId: invite.sessionId,
        data: { type: "session_invite_rejected", otherUsername: inviteeUsername, sessionDate, sessionLocation },
      }),
    ]);

    captureEvent(session.user.name ?? `userId[${userId}]`, "session invite rejected", {
      invite_id: Number(id),
    });

    return NextResponse.json({ success: true });
  }

  // Validate update target before doing any work
  if (body.action === "overwrite") {
    if (!body.existingSessionId) {
      return NextResponse.json({ error: "existingSessionId is required for overwrite" }, { status: 400 });
    }
    const existing = await prisma.session.findUnique({
      where: { id: body.existingSessionId },
      select: { userId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Existing session not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Accept / overwrite: build player mappings and financials
  const src = invite.session;
  const sp = invite.sessionPlayer;
  const link = invite.link;
  const linkId = link.id;

  // Determine which of the invitee's own players represents the session creator.
  // Original direction: ownerUser created session, linkedUser is invitee → use linkedPlayerId
  // Reversed direction: linkedUser created session, ownerUser is invitee → use ownerPlayerId
  const inviteeIsOwner = userId === link.ownerUserId;
  const targetPlayerId: number | null = inviteeIsOwner
    ? link.ownerPlayerId
    : (link.linkedPlayerId ?? null);

  // Bob's financials come from the SessionPlayer row Alice created for him.
  // Alice's financials come from the Session itself (Alice is the session owner).
  const myBuyIn = sp.buyIn ?? src.buyIn;
  const myCashOut = sp.cashOut ?? src.cashOut;
  const myProfit = sp.profit ?? src.profit;

  // Resolve other session players automatically
  const { resolved: autoResolved } = await resolveSessionPlayers(Number(id), userId);

  // Process manual mappings from the request body
  // For each mapping: resolve toPlayerId (create player if needed), then save equivalence
  interface FinalMapping { fromPlayerId: number; toPlayerId: number }
  const manualMappings: FinalMapping[] = [];

  if (body.playerMappings?.length) {
    for (const m of body.playerMappings) {
      // Skip if neither toPlayerId nor newPlayerName provided
      if (!m.toPlayerId && !m.newPlayerName) continue;

      let resolvedPlayerId = m.toPlayerId;

      if (!resolvedPlayerId && m.newPlayerName) {
        const name = m.newPlayerName.trim();
        const existing = await prisma.player.findUnique({
          where: { userId_name: { userId, name } },
        });
        if (existing) {
          resolvedPlayerId = existing.id;
        } else {
          const created = await prisma.player.create({ data: { name, userId } });
          resolvedPlayerId = created.id;
        }
      }

      if (resolvedPlayerId) {
        manualMappings.push({ fromPlayerId: m.fromPlayerId, toPlayerId: resolvedPlayerId });
      }
    }
  }

  // Build the full list of other-player SessionPlayers to create in the new session.
  // Auto-resolved players use the original session financials for that player.
  // Manual mappings do too.
  const originalPlayerMap = new Map<number, { buyIn: number | null; cashOut: number | null; profit: number | null }>(
    invite.session.players.map((p: (typeof invite.session.players)[number]) => [
      p.playerId,
      { buyIn: p.buyIn, cashOut: p.cashOut, profit: p.profit },
    ])
  );

  // Combine auto-resolved and manual mappings (manual take precedence if overlapping)
  const allMappings = new Map<number, number>(); // fromPlayerId → toPlayerId
  for (const r of autoResolved) {
    allMappings.set(r.fromPlayerId, r.toPlayerId);
  }
  for (const m of manualMappings) {
    allMappings.set(m.fromPlayerId, m.toPlayerId);
  }

  const sessionDate          = invite.session.date.toISOString();
  const sessionLocation      = invite.session.location;
  const sessionOwnerUsername = invite.session.user.username;
  const inviteeUsername      = invite.invitee.username;

  // ── Overwrite: update financials + upsert players into the existing session ──
  if (body.action === "overwrite") {
    const existingSessionId = body.existingSessionId!;

    await prisma.$transaction(async (tx) => {
      // Update only the invitee's own financials; preserve location, notes, date, etc.
      await tx.session.update({
        where: { id: existingSessionId },
        data: { buyIn: myBuyIn, cashOut: myCashOut, profit: myProfit, sourceInviteId: Number(id) },
      });

      // Upsert other mapped players
      for (const [fromPlayerId, toPlayerId] of allMappings) {
        const orig = originalPlayerMap.get(fromPlayerId);
        await tx.sessionPlayer.upsert({
          where: { sessionId_playerId: { sessionId: existingSessionId, playerId: toPlayerId } },
          create: { sessionId: existingSessionId, playerId: toPlayerId, buyIn: orig?.buyIn ?? null, cashOut: orig?.cashOut ?? null, profit: orig?.profit ?? null },
          update: { buyIn: orig?.buyIn ?? null, cashOut: orig?.cashOut ?? null, profit: orig?.profit ?? null },
        });
      }

      // Upsert the inviter's player
      if (targetPlayerId) {
        await tx.sessionPlayer.upsert({
          where: { sessionId_playerId: { sessionId: existingSessionId, playerId: targetPlayerId } },
          create: { sessionId: existingSessionId, playerId: targetPlayerId, buyIn: src.buyIn, cashOut: src.cashOut, profit: src.profit },
          update: { buyIn: src.buyIn, cashOut: src.cashOut, profit: src.profit },
        });
      }

      await tx.sessionInvite.update({
        where: { id: Number(id) },
        data: { status: "ACCEPTED" },
      });

      if (manualMappings.length > 0) {
        await tx.playerEquivalence.createMany({
          data: manualMappings.map((m) => ({ fromPlayerId: m.fromPlayerId, toPlayerId: m.toPlayerId, linkId })),
          skipDuplicates: true,
        });
      }
    });

    await Promise.all([
      deleteSessionInviteReceivedNotification(invite.id, userId),
      createNotification({
        userId,
        sessionId: existingSessionId,
        data: { type: "session_invite_accepted_by_me", otherUsername: sessionOwnerUsername, sessionDate, sessionLocation },
      }),
      createNotification({
        userId: invite.session.userId,
        sessionId: invite.sessionId,
        data: { type: "session_invite_accepted", otherUsername: inviteeUsername, sessionDate, sessionLocation },
      }),
    ]);

    captureEvent(session.user.name ?? `userId[${userId}]`, "session invite accepted", {
      invite_id: Number(id),
      session_id: existingSessionId,
      overwrite: true,
    });

    return NextResponse.json({ sessionId: existingSessionId });
  }

  // ── Accept: create a new session in the invitee's account ────────────────────
  const newSession = await prisma.$transaction(async (tx) => {
    const additionalPlayers: Array<{ playerId: number; buyIn: number | null; cashOut: number | null; profit: number | null }> = [];
    for (const [fromPlayerId, toPlayerId] of allMappings) {
      const orig = originalPlayerMap.get(fromPlayerId);
      additionalPlayers.push({
        playerId: toPlayerId,
        buyIn: orig?.buyIn ?? null,
        cashOut: orig?.cashOut ?? null,
        profit: orig?.profit ?? null,
      });
    }

    if (targetPlayerId) {
      additionalPlayers.push({
        playerId: targetPlayerId,
        buyIn: src.buyIn,
        cashOut: src.cashOut,
        profit: src.profit,
      });
    }

    const created = await tx.session.create({
      data: {
        date: src.date,
        location: src.location,
        notes: src.notes,
        buyIn: myBuyIn,
        cashOut: myCashOut,
        profit: myProfit,
        userId,
        sourceInviteId: Number(id),
        players: additionalPlayers.length > 0 ? { create: additionalPlayers } : undefined,
      },
    });

    await tx.sessionInvite.update({
      where: { id: Number(id) },
      data: { status: "ACCEPTED" },
    });

    if (manualMappings.length > 0) {
      await tx.playerEquivalence.createMany({
        data: manualMappings.map((m) => ({ fromPlayerId: m.fromPlayerId, toPlayerId: m.toPlayerId, linkId })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  await Promise.all([
    deleteSessionInviteReceivedNotification(invite.id, userId),
    createNotification({
      userId,
      sessionId: newSession.id,
      data: { type: "session_invite_accepted_by_me", otherUsername: sessionOwnerUsername, sessionDate, sessionLocation },
    }),
    createNotification({
      userId: invite.session.userId,
      sessionId: invite.sessionId,
      data: { type: "session_invite_accepted", otherUsername: inviteeUsername, sessionDate, sessionLocation },
    }),
  ]);

  captureEvent(session.user.name ?? `userId[${userId}]`, "session invite accepted", {
    invite_id: Number(id),
    session_id: newSession.id,
  });

  return NextResponse.json({ sessionId: newSession.id });
}
