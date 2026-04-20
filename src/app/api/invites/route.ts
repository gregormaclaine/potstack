import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const raw = await prisma.sessionInvite.findMany({
    where: { inviteeId: userId, status: "PENDING" },
    include: {
      session: { select: { date: true, location: true, notes: true } },
      sessionPlayer: { select: { buyIn: true, cashOut: true, profit: true } },
      link: {
        include: {
          ownerPlayer: { select: { name: true } },
          ownerUser: { select: { username: true, avatar: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = raw.map((inv) => ({
    id: inv.id,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    requesterUsername: inv.link.ownerUser.username,
    requesterAvatar: inv.link.ownerUser.avatar,
    playerName: inv.link.ownerPlayer.name,
    session: {
      date: inv.session.date.toISOString(),
      location: inv.session.location,
      notes: inv.session.notes,
    },
    sessionPlayer: {
      buyIn: inv.sessionPlayer.buyIn,
      cashOut: inv.sessionPlayer.cashOut,
      profit: inv.sessionPlayer.profit,
    },
  }));

  return NextResponse.json({ invites });
}
