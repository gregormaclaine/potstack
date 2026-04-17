import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import {
  createNotification,
  deleteSessionInviteReceivedNotification,
} from "@/lib/createNotification";
import { revalidateTag } from "next/cache";
import type { PlayerMapping } from "@/types";

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
  const body: { action: "accept" | "reject"; playerMappings?: PlayerMapping[] } =
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

    revalidateTag(`invites:${userId}`, "max");

    return NextResponse.json({ success: true });
  }

  // Accept: create a new session in the invitee's account
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

  const newSession = await prisma.$transaction(async (tx) => {
    // Build additional SessionPlayer create data
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

    // Add the link's linkedPlayer (representing the session owner) if present
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
        players: additionalPlayers.length > 0 ? { create: additionalPlayers } : undefined,
      },
    });

    await tx.sessionInvite.update({
      where: { id: Number(id) },
      data: { status: "ACCEPTED" },
    });

    // Save PlayerEquivalences for manual mappings (not auto-resolved via link graph,
    // as those will always be resolvable through the graph)
    if (manualMappings.length > 0) {
      await tx.playerEquivalence.createMany({
        data: manualMappings.map((m) => ({
          fromPlayerId: m.fromPlayerId,
          toPlayerId: m.toPlayerId,
          linkId,
        })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  const sessionDate         = invite.session.date.toISOString();
  const sessionLocation     = invite.session.location;
  const sessionOwnerUsername = invite.session.user.username;
  const inviteeUsername     = invite.invitee.username;

  await Promise.all([
    deleteSessionInviteReceivedNotification(invite.id, userId),
    // Invitee: "You accepted @owner's session"
    createNotification({
      userId,
      sessionId: newSession.id, // their new copy of the session
      data: { type: "session_invite_accepted_by_me", otherUsername: sessionOwnerUsername, sessionDate, sessionLocation },
    }),
    // Session owner: "@invitee accepted your session"
    createNotification({
      userId: invite.session.userId,
      sessionId: invite.sessionId, // the original session
      data: { type: "session_invite_accepted", otherUsername: inviteeUsername, sessionDate, sessionLocation },
    }),
  ]);

  revalidateTag(`sessions:${userId}`, "max");
  revalidateTag(`invites:${userId}`, "max");

  return NextResponse.json({ sessionId: newSession.id });
}
