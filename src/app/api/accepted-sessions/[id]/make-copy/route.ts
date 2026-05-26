import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import { captureEvent } from "@/lib/posthog";
import { computeAndSaveBreakdownStats } from "@/lib/computeBreakdownStats";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);
  const { id } = await params;

  const accepted = await prisma.acceptedSession.findUnique({
    where: { id: Number(id) },
    include: {
      session: {
        include: {
          players: true,
        },
      },
      invite: {
        select: {
          id: true,
          sessionPlayerId: true,
          linkId: true,
          link: { select: { ownerUserId: true, ownerPlayerId: true, linkedPlayerId: true } },
        },
      },
    },
  });

  if (!accepted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (accepted.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const src = accepted.session;
  const invite = accepted.invite;

  // Get invitee's own SessionPlayer row (their buy-in/profit in the original session)
  const mySessionPlayer = src.players.find((sp) => sp.id === invite.sessionPlayerId);
  const myBuyIn   = mySessionPlayer?.buyIn   ?? src.buyIn;
  const myCashOut = mySessionPlayer?.cashOut ?? src.cashOut;
  const myProfit  = mySessionPlayer?.profit  ?? src.profit;

  // Resolve all other players via equivalences and link graph
  const { resolved } = await resolveSessionPlayers(invite.id, userId);
  const resolvedMap = new Map(resolved.map((r) => [r.fromPlayerId, r.toPlayerId]));

  // Build SessionPlayer rows for the copy (resolved players only; unresolved are skipped)
  const originalPlayerMap = new Map(
    src.players.map((sp) => [sp.playerId, { buyIn: sp.buyIn, cashOut: sp.cashOut, profit: sp.profit }])
  );

  const additionalPlayers: Array<{ playerId: number; buyIn: number | null; cashOut: number | null; profit: number | null }> = [];
  for (const [fromPlayerId, toPlayerId] of resolvedMap) {
    if (fromPlayerId === mySessionPlayer?.playerId) continue;
    const orig = originalPlayerMap.get(fromPlayerId);
    additionalPlayers.push({ playerId: toPlayerId, buyIn: orig?.buyIn ?? null, cashOut: orig?.cashOut ?? null, profit: orig?.profit ?? null });
  }

  // Also add the session creator as a player using their mapped player in invitee's account
  const inviteeIsOwner = userId === invite.link.ownerUserId;
  const creatorMappedPlayerId = inviteeIsOwner ? invite.link.linkedPlayerId : invite.link.ownerPlayerId;
  if (creatorMappedPlayerId) {
    additionalPlayers.push({ playerId: creatorMappedPlayerId, buyIn: src.buyIn, cashOut: src.cashOut, profit: src.profit });
  }

  const newSession = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        date: src.date,
        location: accepted.localLocation ?? src.location,
        notes: src.notes,
        buyIn: myBuyIn,
        cashOut: myCashOut,
        profit: myProfit,
        userId,
        players: additionalPlayers.length > 0 ? { create: additionalPlayers } : undefined,
      },
    });
    await tx.acceptedSession.delete({ where: { id: Number(id) } });
    return created;
  });

  await computeAndSaveBreakdownStats(userId);

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "accepted session converted to copy", {
    accepted_session_id: Number(id),
    new_session_id: newSession.id,
  });

  return NextResponse.json({ newSessionId: newSession.id });
}
