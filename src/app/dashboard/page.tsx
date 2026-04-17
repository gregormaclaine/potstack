import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { cacheLife, cacheTag } from "next/cache";
import { buildDashboardStats, filterSessionsByTimeline, filterSessionsByEvent } from "@/lib/stats";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/dashboard/StatCard";
import ProfitLineChart from "@/components/dashboard/ProfitLineChart";
import WinLossBarChart from "@/components/dashboard/WinLossBarChart";
import ProfitSpreadChart from "@/components/dashboard/ProfitSpreadChart";
import TopPlayersChart from "@/components/dashboard/TopPlayersChart";
import SessionBreakdownTable from "@/components/dashboard/SessionBreakdownTable";
import TimelineSelector from "@/components/dashboard/TimelineSelector";
import EventSelector from "@/components/dashboard/EventSelector";
import Button from "@/components/ui/Button";
import { getDashboardData } from "@/lib/cache/dashboard";
import DashboardLoading from "./loading";
import type { SessionWithPlayers, PokerEvent } from "@/types";
import type { EventModel } from "@/generated/prisma/models/Event";
import type { Timeline } from "@/components/dashboard/TimelineSelector";

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardAuthBridge searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardAuthBridge({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const { timeline: timelineParam, event: eventParam } = await searchParams;

  const timeline: Timeline =
    timelineParam === "ytd" ||
    timelineParam === "last-3-months" ||
    timelineParam === "this-month"
      ? timelineParam
      : "all";

  const eventId = eventParam ? Number(eventParam) : null;

  return <DashboardView userId={userId} timeline={timeline} eventId={eventId} />;
}

async function DashboardView({
  userId,
  timeline,
  eventId,
}: {
  userId: number;
  timeline: Timeline;
  eventId: number | null;
}) {
  "use cache";
  cacheTag(`sessions:${userId}`, `events:${userId}`);
  cacheLife("hours");

  const [raw, rawEvents] = await getDashboardData(userId);

  const allSessions: SessionWithPlayers[] = raw.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    location: s.location,
    notes: s.notes,
    buyIn: s.buyIn,
    cashOut: s.cashOut,
    profit: s.profit,
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
  }));

  const events: PokerEvent[] = (rawEvents as EventModel[]).map((e) => ({
    id: e.id,
    name: e.name,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const activeEvent = eventId ? events.find((e) => e.id === eventId) ?? null : null;

  const sessions = activeEvent
    ? filterSessionsByEvent(allSessions, activeEvent)
    : filterSessionsByTimeline(allSessions, timeline);

  const stats = buildDashboardStats(sessions);

  const profitTrend =
    stats.totalProfit > 0
      ? "up"
      : stats.totalProfit < 0
      ? "down"
      : "neutral";

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <EventSelector events={events} currentEventId={activeEvent?.id ?? null} />
      {!activeEvent && <TimelineSelector current={timeline} />}
    </div>
  );

  if (sessions.length === 0) {
    return (
      <PageWrapper>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          {filterBar}
        </div>
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-lg font-medium text-zinc-400">
            {activeEvent ? `No sessions in "${activeEvent.name}"` : "No sessions recorded yet"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {activeEvent
              ? "No sessions fall within this event's date range."
              : "Start tracking your poker sessions to see your stats here."}
          </p>
          {!activeEvent && (
            <Link href="/sessions/new">
              <Button className="mt-6">Record First Session</Button>
            </Link>
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <div className="flex items-center gap-3">
          {filterBar}
          <Link href="/sessions/new">
            <Button size="sm">New Session</Button>
          </Link>
        </div>
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
            Profit Spread by Buy-in
          </h2>
          <ProfitSpreadChart sessions={sessions} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            Most Played With
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
