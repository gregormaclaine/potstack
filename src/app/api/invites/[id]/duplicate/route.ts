import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { DuplicateSessionInfo } from "@/types";

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
      link: { select: { ownerPlayerId: true, linkedPlayerId: true, ownerUserId: true } },
      session: { select: { date: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.inviteeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inviteeIsOwner = userId === invite.link.ownerUserId;
  const targetPlayerId = inviteeIsOwner
    ? invite.link.ownerPlayerId
    : (invite.link.linkedPlayerId ?? null);

  if (!targetPlayerId) {
    return NextResponse.json(null);
  }

  const dup = await prisma.session.findFirst({
    where: {
      userId,
      date: invite.session.date,
      players: { some: { playerId: targetPlayerId } },
    },
    select: { id: true, buyIn: true, cashOut: true, profit: true },
  });

  if (!dup) {
    return NextResponse.json(null);
  }

  const result: DuplicateSessionInfo = {
    sessionId: dup.id,
    myBuyIn: dup.buyIn,
    myCashOut: dup.cashOut,
    myProfit: dup.profit,
  };

  return NextResponse.json(result);
}
