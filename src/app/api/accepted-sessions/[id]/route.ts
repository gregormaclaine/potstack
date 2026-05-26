import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import { captureEvent } from "@/lib/posthog";
import type { AcceptedSessionPlayer } from "@/types";

export async function GET(
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
          players: {
            include: { player: { select: { id: true, name: true } } },
            orderBy: { player: { name: "asc" } },
          },
          user: { select: { username: true } },
        },
      },
      sessionPlayer: { select: { id: true } },
    },
  });

  if (!accepted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (accepted.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { resolved } = await resolveSessionPlayers(accepted.linkId, accepted.sessionPlayerId, accepted.sessionId, userId);
  const resolvedMap = new Map(resolved.map((r) => [r.fromPlayerId, r]));

  const players: AcceptedSessionPlayer[] = accepted.session.players.map((sp) => {
    const isMe = sp.id === accepted.sessionPlayerId;
    const match = resolvedMap.get(sp.playerId);
    return {
      fromPlayerId: sp.playerId,
      fromPlayerName: sp.player.name,
      toPlayerId: match?.toPlayerId ?? null,
      toPlayerName: match?.toPlayerName ?? null,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
      isMe,
      resolvedVia: match?.resolvedVia ?? null,
      linkedUsername: match?.linkedUsername ?? null,
    };
  });

  return NextResponse.json({
    id: accepted.id,
    sessionId: accepted.sessionId,
    date: accepted.session.date.toISOString(),
    location: accepted.session.location,
    localLocation: accepted.localLocation,
    notes: accepted.session.notes,
    inviterUsername: accepted.session.user.username,
    players,
  });
}

export async function DELETE(
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
    select: { userId: true, inviteId: true },
  });

  if (!accepted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (accepted.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.acceptedSession.delete({ where: { id: Number(id) } });
    if (accepted.inviteId !== null) {
      await tx.sessionInvite.update({
        where: { id: accepted.inviteId },
        data: { status: "DISMISSED" },
      });
    }
  });

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "accepted session dismissed", {
    accepted_session_id: Number(id),
  });

  return NextResponse.json({ success: true });
}
