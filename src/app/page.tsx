import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import CurrentYear from "@/components/ui/CurrentYear";
import StatCard from "@/components/dashboard/StatCard";
import ProfitLineChart from "@/components/dashboard/ProfitLineChart";
import WinLossBarChart from "@/components/dashboard/WinLossBarChart";
import TopPlayersChart from "@/components/dashboard/TopPlayersChart";
import SessionBreakdownTable from "@/components/dashboard/SessionBreakdownTable";
import ProfitSpreadChart from "@/components/dashboard/ProfitSpreadChart";
import type {
  ProfitOverTimePoint,
  WinLossPoint,
  TopPlayer,
  SessionWithPlayers,
} from "@/types";

// ── Dummy data ──────────────────────────────────────────────────────────────

const profitOverTime: ProfitOverTimePoint[] = [
  { date: "2025-08-04", sessionProfit: 55, cumulativeProfit: 55 },
  { date: "2025-08-11", sessionProfit: -40, cumulativeProfit: 15 },
  { date: "2025-08-18", sessionProfit: 90, cumulativeProfit: 105 },
  { date: "2025-08-25", sessionProfit: -25, cumulativeProfit: 80 },
  { date: "2025-09-01", sessionProfit: 70, cumulativeProfit: 150 },
  { date: "2025-09-08", sessionProfit: 30, cumulativeProfit: 180 },
  { date: "2025-09-15", sessionProfit: -60, cumulativeProfit: 120 },
  { date: "2025-09-22", sessionProfit: 120, cumulativeProfit: 240 },
  { date: "2025-09-29", sessionProfit: -15, cumulativeProfit: 225 },
  { date: "2025-10-06", sessionProfit: 85, cumulativeProfit: 310 },
  { date: "2025-10-13", sessionProfit: -50, cumulativeProfit: 260 },
  { date: "2025-10-20", sessionProfit: 45, cumulativeProfit: 305 },
  { date: "2025-10-27", sessionProfit: 130, cumulativeProfit: 435 },
  { date: "2025-11-03", sessionProfit: -80, cumulativeProfit: 355 },
  { date: "2025-11-10", sessionProfit: 95, cumulativeProfit: 450 },
  { date: "2025-11-17", sessionProfit: 60, cumulativeProfit: 510 },
  { date: "2025-11-24", sessionProfit: -35, cumulativeProfit: 475 },
  { date: "2025-12-01", sessionProfit: 280, cumulativeProfit: 755 },
  { date: "2025-12-08", sessionProfit: -95, cumulativeProfit: 660 },
  { date: "2025-12-15", sessionProfit: 180, cumulativeProfit: 840 },
];

const winLossPerSession: WinLossPoint[] = profitOverTime.map((p, i) => ({
  sessionId: i + 1,
  date: p.date,
  profit: p.sessionProfit,
}));

const topPlayers: TopPlayer[] = [
  { playerId: 1, name: "Jamie", sessions: 16, totalProfit: null },
  { playerId: 2, name: "Sam", sessions: 14, totalProfit: null },
  { playerId: 3, name: "Alex", sessions: 12, totalProfit: null },
  { playerId: 4, name: "Morgan", sessions: 9, totalProfit: null },
  { playerId: 5, name: "Taylor", sessions: 7, totalProfit: null },
];

const recentSessions: SessionWithPlayers[] = [
  {
    id: 1,
    date: "2025-12-15T00:00:00.000Z",
    location: "Home Game",
    notes: null,
    buyIn: 50,
    cashOut: 230,
    profit: 180,
    createdAt: "2025-12-15T20:00:00.000Z",
    updatedAt: "2025-12-15T20:00:00.000Z",
    players: [
      {
        id: 1,
        playerId: 1,
        playerName: "Jamie",
        buyIn: 50,
        cashOut: 10,
        profit: -40,
      },
      {
        id: 2,
        playerId: 2,
        playerName: "Sam",
        buyIn: 50,
        cashOut: 60,
        profit: 10,
      },
      {
        id: 3,
        playerId: 3,
        playerName: "Alex",
        buyIn: 50,
        cashOut: 80,
        profit: 30,
      },
    ],
  },
  {
    id: 2,
    date: "2025-12-08T00:00:00.000Z",
    location: "Casino",
    notes: null,
    buyIn: 100,
    cashOut: 5,
    profit: -95,
    createdAt: "2025-12-08T22:00:00.000Z",
    updatedAt: "2025-12-08T22:00:00.000Z",
    players: [
      {
        id: 4,
        playerId: 4,
        playerName: "Morgan",
        buyIn: 100,
        cashOut: 150,
        profit: 50,
      },
    ],
  },
  {
    id: 3,
    date: "2025-12-01T00:00:00.000Z",
    location: "Home Game",
    notes: null,
    buyIn: 50,
    cashOut: 330,
    profit: 280,
    createdAt: "2025-12-01T21:30:00.000Z",
    updatedAt: "2025-12-01T21:30:00.000Z",
    players: [
      {
        id: 5,
        playerId: 1,
        playerName: "Jamie",
        buyIn: 50,
        cashOut: 20,
        profit: -30,
      },
      {
        id: 6,
        playerId: 5,
        playerName: "Taylor",
        buyIn: 50,
        cashOut: 0,
        profit: -50,
      },
    ],
  },
  {
    id: 4,
    date: "2025-11-24T00:00:00.000Z",
    location: "Pub Night",
    notes: null,
    buyIn: 20,
    cashOut: -15,
    profit: -35,
    createdAt: "2025-11-24T19:00:00.000Z",
    updatedAt: "2025-11-24T19:00:00.000Z",
    players: [
      {
        id: 7,
        playerId: 2,
        playerName: "Sam",
        buyIn: 20,
        cashOut: 55,
        profit: 35,
      },
    ],
  },
  {
    id: 5,
    date: "2025-11-17T00:00:00.000Z",
    location: "Home Game",
    notes: null,
    buyIn: 50,
    cashOut: 110,
    profit: 60,
    createdAt: "2025-11-17T20:00:00.000Z",
    updatedAt: "2025-11-17T20:00:00.000Z",
    players: [
      {
        id: 8,
        playerId: 3,
        playerName: "Alex",
        buyIn: 50,
        cashOut: 40,
        profit: -10,
      },
      {
        id: 9,
        playerId: 4,
        playerName: "Morgan",
        buyIn: 50,
        cashOut: 60,
        profit: 10,
      },
    ],
  },
];

function s(
  id: number,
  date: string,
  buyIn: number,
  profit: number,
): SessionWithPlayers {
  return {
    id,
    date: `${date}T00:00:00.000Z`,
    location: null,
    notes: null,
    buyIn,
    cashOut: buyIn + profit,
    profit,
    createdAt: `${date}T20:00:00.000Z`,
    updatedAt: `${date}T20:00:00.000Z`,
    players: [],
  };
}

const spreadSessions: SessionWithPlayers[] = [
  s(101, "2025-08-04", 20, 15),
  s(102, "2025-08-18", 20, -20),
  s(103, "2025-09-01", 20, 5),
  s(104, "2025-09-15", 20, -15),
  s(105, "2025-10-06", 20, 20),
  s(106, "2025-08-11", 50, 45),
  s(107, "2025-08-25", 50, -25),
  s(108, "2025-09-08", 50, 30),
  s(109, "2025-09-22", 50, 120),
  s(110, "2025-10-13", 50, -50),
  s(111, "2025-10-27", 50, 130),
  s(112, "2025-11-10", 50, 95),
  s(113, "2025-11-24", 50, -35),
  s(114, "2025-12-08", 50, -80),
  s(115, "2025-12-15", 50, 180),
  s(116, "2025-09-29", 100, -80),
  s(117, "2025-10-20", 100, 45),
  s(118, "2025-11-03", 100, -95),
  s(119, "2025-11-17", 100, 60),
  s(120, "2025-12-01", 100, 280),
];

// ── Page ────────────────────────────────────────────────────────────────────

async function AuthRedirect() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return null;
}

export default function RootPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense>
        <AuthRedirect />
      </Suspense>
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight text-emerald-400">
            PotStack
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-zinc-50">
            The tracker built for{" "}
            <span className="text-emerald-400">your home game</span>
          </h1>
          <p className="mt-5 text-lg text-zinc-400 leading-relaxed">
            Track sessions, see who's up on the group, and settle the
            long-running debate about who's actually the best player at the
            table.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="rounded-lg bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500"
            >
              Start tracking
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dashboard preview ── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-zinc-100">
              Everything you need, at a glance
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Live preview with sample data
            </p>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Sessions" value="20" trend="neutral" />
            <StatCard title="Total Profit" value="+£840" trend="up" />
            <StatCard title="Win Rate" value="60%" trend="up" />
            <StatCard title="Avg / Session" value="+£42" trend="up" />
            <StatCard title="Biggest Win" value="£280" trend="up" />
            <StatCard title="Biggest Loss" value="£95" trend="down" />
          </div>

          {/* Charts row 1 */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Cumulative Profit
              </h2>
              <ProfitLineChart data={profitOverTime} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Profit / Loss per Session
              </h2>
              <WinLossBarChart data={winLossPerSession} />
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Most Played With
              </h2>
              <TopPlayersChart data={topPlayers} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Profit Spread by Buy-in
              </h2>
              <ProfitSpreadChart sessions={spreadSessions} />
            </div>
          </div>

          {/* Recent sessions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">
                Recent Sessions
              </h2>
              <span className="text-xs text-zinc-600">Sample data</span>
            </div>
            <SessionBreakdownTable sessions={recentSessions} />
          </div>
        </div>
      </section>

{/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 px-4 py-6 text-center text-xs text-zinc-600">
        © <CurrentYear /> PotStack
      </footer>
    </div>
  );
}
