import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createNotification,
  deleteSessionInviteReceivedNotification,
} from "@/lib/createNotification";
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
  const body: { action: "accept" | "reject" } = await request.json();

  const invite = await prisma.sessionInvite.findUnique({
    where: { id: Number(id) },
    include: {
      session: { select: { date: true, location: true, userId: true, user: { select: { username: true } } } },
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

  const sessionDate          = invite.session.date.toISOString();
  const sessionLocation      = invite.session.location;
  const sessionOwnerUsername = invite.session.user.username;
  const inviteeUsername      = invite.invitee.username;

  if (body.action === "reject") {
    await prisma.sessionInvite.update({
      where: { id: Number(id) },
      data: { status: "REJECTED" },
    });

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

  // ── Accept: create an AcceptedSession reference (no data duplication) ────────
  const accepted = await prisma.$transaction(async (tx) => {
    const record = await tx.acceptedSession.create({
      data: { userId, sessionId: invite.sessionId, inviteId: Number(id), sessionPlayerId: invite.sessionPlayerId, linkId: invite.linkId },
    });
    await tx.sessionInvite.update({
      where: { id: Number(id) },
      data: { status: "ACCEPTED" },
    });
    return record;
  });

  await Promise.all([
    deleteSessionInviteReceivedNotification(invite.id, userId),
    createNotification({
      userId,
      sessionId: invite.sessionId,
      data: { type: "session_invite_accepted_by_me", otherUsername: sessionOwnerUsername, sessionDate, sessionLocation, acceptedSessionId: accepted.id },
    }),
    createNotification({
      userId: invite.session.userId,
      sessionId: invite.sessionId,
      data: { type: "session_invite_accepted", otherUsername: inviteeUsername, sessionDate, sessionLocation },
    }),
  ]);

  captureEvent(session.user.name ?? `userId[${userId}]`, "session invite accepted", {
    invite_id: Number(id),
    accepted_session_id: accepted.id,
  });

  return NextResponse.json({ acceptedSessionId: accepted.id });
}
