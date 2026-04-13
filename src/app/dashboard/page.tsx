import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildDashboardStats } from "@/lib/stats";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/dashboard/StatCard";
import ProfitLineChart from "@/components/dashboard/ProfitLineChart";
import WinLossBarChart from "@/components/dashboard/WinLossBarChart";
import BuyInVsCashOutChart from "@/components/dashboard/BuyInVsCashOutChart";
import TopPlayersChart from "@/components/dashboard/TopPlayersChart";
import SessionBreakdownTable from "@/components/dashboard/SessionBreakdownTable";
import Button from "@/components/ui/Button";
import type { SessionWithPlayers } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const raw = await prisma.session.findMany({
    orderBy: { date: "asc" },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  });

  const sessions: SessionWithPlayers[] = raw.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    location: s.location,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    players: s.players.map((sp) => ({
      id: sp.id,
      playerId: sp.playerId,
      playerName: sp.player.name,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
    })),
    totalBuyIn: s.players.reduce((sum, sp) => sum + sp.buyIn, 0),
    totalCashOut: s.players.reduce((sum, sp) => sum + sp.cashOut, 0),
    totalProfit: s.players.reduce((sum, sp) => sum + sp.profit, 0),
  }));

  const stats = buildDashboardStats(sessions);

  const profitTrend =
    stats.totalProfit > 0
      ? "up"
      : stats.totalProfit < 0
      ? "down"
      : "neutral";

  if (sessions.length === 0) {
    return (
      <PageWrapper>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-lg font-medium text-zinc-400">
            No sessions recorded yet
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Start tracking your poker sessions to see your stats here.
          </p>
          <Link href="/sessions/new">
            <Button className="mt-6">Record First Session</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <Link href="/sessions/new">
          <Button size="sm">New Session</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Sessions"
          value={String(stats.totalSessions)}
          trend="neutral"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          trend={profitTrend}
        />
        <StatCard
          title="Win Rate"
          value={formatPercent(stats.winRate)}
          trend={stats.winRate >= 50 ? "up" : "down"}
        />
        <StatCard
          title="Avg / Session"
          value={formatCurrency(stats.avgProfitPerSession)}
          trend={stats.avgProfitPerSession >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Biggest Win"
          value={formatCurrency(stats.biggestWin)}
          trend="up"
        />
        <StatCard
          title="Biggest Loss"
          value={formatCurrency(Math.abs(stats.biggestLoss))}
          trend="down"
        />
      </div>

      {/* Charts row 1 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Cumulative Profit
          </h2>
          <ProfitLineChart data={stats.profitOverTime} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Profit / Loss per Session
          </h2>
          <WinLossBarChart data={stats.winLossPerSession} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Buy-in vs Cash-out
          </h2>
          <BuyInVsCashOutChart sessions={sessions} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Top Players by Profit
          </h2>
          <TopPlayersChart data={stats.topPlayers} />
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            Recent Sessions
          </h2>
          <Link
            href="/sessions"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all →
          </Link>
        </div>
        <SessionBreakdownTable sessions={stats.recentSessions} />
      </div>
    </PageWrapper>
  );
}
