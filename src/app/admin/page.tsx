import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/dashboard/StatCard";

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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">
            Most Active Users
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium text-right">Sessions</th>
                <th className="pb-2 font-medium text-right">Players</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {topUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5">
                    <span className="font-medium text-zinc-200">
                      {u.username}
                    </span>
                    {u.isAdmin && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-400">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-zinc-400">
                    {u._count.sessions}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-zinc-400">
                    {u._count.players}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">
            Recent Sign-ups
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Joined</th>
                <th className="pb-2 font-medium text-right">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5">
                    <span className="font-medium text-zinc-200">
                      {u.username}
                    </span>
                    {u.isAdmin && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-400">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-zinc-400">
                    {u._count.sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
