import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotification } from "@/lib/createNotification";
import { captureEvent } from "@/lib/posthog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);

  const { id } = await params;
  const sessionId = Number(id);
  const body: { sessionPlayerId: number } = await request.json();

  const session = await prisma.session.findUnique({
    where: { id: sessionId, userId },
    select: { id: true, date: true, location: true, user: { select: { username: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionPlayer = await prisma.sessionPlayer.findUnique({
    where: { id: body.sessionPlayerId, sessionId },
    select: { id: true, playerId: true, buyIn: true, cashOut: true, profit: true },
  });
  if (!sessionPlayer) {
    return NextResponse.json({ error: "Session player not found" }, { status: 404 });
  }

  // Find the accepted PlayerLink for this player (either direction involving the current user)
  const [ownerLink, linkedLink] = await Promise.all([
    prisma.playerLink.findFirst({
      where: { ownerUserId: userId, ownerPlayerId: sessionPlayer.playerId, status: "ACCEPTED" },
    }),
    prisma.playerLink.findFirst({
      where: { linkedUserId: userId, linkedPlayerId: sessionPlayer.playerId, status: "ACCEPTED" },
    }),
  ]);

  const link = ownerLink ?? linkedLink;
  if (!link) {
    return NextResponse.json(
      { error: "No accepted player link found for this player" },
      { status: 400 }
    );
  }

  const inviteeId = ownerLink ? link.linkedUserId : link.ownerUserId;

  // Check if invite already exists
  const existing = await prisma.sessionInvite.findUnique({
    where: { sessionId_linkId: { sessionId, linkId: link.id } },
  });
  if (existing) {
    return NextResponse.json({ invite: { id: existing.id, status: existing.status } });
  }

  const invite = await prisma.sessionInvite.create({
    data: {
      sessionId,
      sessionPlayerId: sessionPlayer.id,
      linkId: link.id,
      inviteeId,
    },
  });

  await createNotification({
    userId: inviteeId,
    inviteId: invite.id,
    sessionId,
    data: {
      type: "session_invite_received",
      inviterUsername: session.user.username,
      sessionDate: session.date.toISOString(),
      sessionLocation: session.location,
      buyIn: sessionPlayer.buyIn,
      cashOut: sessionPlayer.cashOut,
      profit: sessionPlayer.profit,
    },
  });

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "session shared", {
    session_id: sessionId,
    invite_id: invite.id,
  });

  return NextResponse.json({ invite: { id: invite.id, status: invite.status } });
}
