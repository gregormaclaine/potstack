import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    newUsersLast30Days,
    totalSessions,
    totalPlayers,
    totalSessionPlayers,
    topUsers,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.session.count(),
    prisma.player.count(),
    prisma.sessionPlayer.count(),
    prisma.user.findMany({
      orderBy: { sessions: { _count: "desc" } },
      take: 10,
      select: {
        id: true,
        username: true,
        createdAt: true,
        isAdmin: true,
        _count: { select: { sessions: true, players: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        username: true,
        createdAt: true,
        isAdmin: true,
        _count: { select: { sessions: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    newUsersLast30Days,
    totalSessions,
    totalPlayers,
    totalSessionPlayers,
    topUsers: topUsers.map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.createdAt.toISOString(),
      isAdmin: u.isAdmin,
      sessionCount: u._count.sessions,
      playerCount: u._count.players,
    })),
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.createdAt.toISOString(),
      isAdmin: u.isAdmin,
      sessionCount: u._count.sessions,
    })),
  });
}
