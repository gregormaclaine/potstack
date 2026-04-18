import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/dashboard/StatCard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) notFound();

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

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Admin Dashboard</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Total Users" value={String(totalUsers)} />
        <StatCard
          title="New Users (30d)"
          value={String(newUsersLast30Days)}
          trend={newUsersLast30Days > 0 ? "up" : "neutral"}
        />
        <StatCard title="Total Sessions" value={String(totalSessions)} />
        <StatCard title="Total Players" value={String(totalPlayers)} />
        <StatCard title="Session Entries" value={String(totalSessionPlayers)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminUsersTable
          title="Most Active Users"
          users={topUsers.map((u) => ({
            id: u.id,
            username: u.username,
            isAdmin: u.isAdmin,
            sessions: u._count.sessions,
            players: u._count.players,
          }))}
          columns={["sessions", "players"]}
          currentUserId={session.user.id}
        />

        <AdminUsersTable
          title="Recent Sign-ups"
          users={recentUsers.map((u) => ({
            id: u.id,
            username: u.username,
            isAdmin: u.isAdmin,
            sessions: u._count.sessions,
            joinedAt: u.createdAt.toISOString(),
          }))}
          columns={["joined", "sessions"]}
          currentUserId={session.user.id}
        />
      </div>
    </PageWrapper>
  );
}
