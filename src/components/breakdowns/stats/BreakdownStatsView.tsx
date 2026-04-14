"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import WinRateCIChart from "@/components/breakdowns/stats/WinRateCIChart";
import ProfitProbChart from "@/components/breakdowns/stats/ProfitProbChart";
import { formatPercent } from "@/lib/formatters";
import type {
  PlayerBreakdownRow,
  GroupBreakdownRow,
  BreakdownStatsItem,
} from "@/types";

const REFRESH_RATE_LIMIT_MS = 10 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface BreakdownStatsViewProps {
  playerRows: PlayerBreakdownRow[];
  groupRows: GroupBreakdownRow[];
  breakdownStats: BreakdownStatsItem[];
  lastRefreshedAt: string | null;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hrs ago`;
}

function ExplainerCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-zinc-400">
          How is this calculated?
        </span>
        <span className="text-xs text-zinc-600">{open ? "▲ hide" : "▼ show"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
          <h3 className="mb-2 text-sm font-semibold text-zinc-200">{title}</h3>
          <div className="space-y-2 text-xs leading-relaxed text-zinc-400">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({
  rows,
  mode,
  statsMap,
}: {
  rows: (PlayerBreakdownRow | GroupBreakdownRow)[];
  mode: "player" | "group";
  statsMap: Map<string, BreakdownStatsItem>;
}) {
  const entityType = mode === "player" ? "player" : "group";
  const rowsWithStats = rows.filter((row) => {
    const id = "playerId" in row ? row.playerId : (row as GroupBreakdownRow).groupId;
    return statsMap.has(`${entityType}:${id}`);
  });

  if (rowsWithStats.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Sessions</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Win Rate</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">95% CI</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">P(Profit)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((row) => {
            const id = "playerId" in row ? row.playerId : (row as GroupBreakdownRow).groupId;
            const stats = statsMap.get(`${entityType}:${id}`);
            return (
              <tr key={id} className="bg-zinc-950 hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-medium text-zinc-200">{row.name}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{row.sessions}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{formatPercent(row.winRate)}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-400">
                  {stats
                    ? `${formatPercent(stats.winRateCILow)} – ${formatPercent(stats.winRateCIHigh)}`
                    : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {stats ? (
                    <span className={clsx(
                      "font-medium",
                      stats.profitProbability >= 0.5 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {formatPercent(stats.profitProbability * 100)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BreakdownStatsView({
  playerRows,
  groupRows,
  breakdownStats,
  lastRefreshedAt,
}: BreakdownStatsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"player" | "group">("player");
  const [currentLastRefreshedAt, setCurrentLastRefreshedAt] = useState(lastRefreshedAt);

  const statsMap = useMemo(() => {
    const m = new Map<string, BreakdownStatsItem>();
    for (const s of breakdownStats) {
      m.set(`${s.entityType}:${s.entityId}`, s);
    }
    return m;
  }, [breakdownStats]);

  const filteredGroupRows = useMemo(
    () => groupRows.filter((r) => r.groupId !== -1),
    [groupRows]
  );
  const rows = mode === "player" ? playerRows : filteredGroupRows;
  const entityType = mode === "player" ? "player" : "group";

  const isRateLimited =
    currentLastRefreshedAt !== null &&
    Date.now() - new Date(currentLastRefreshedAt).getTime() < REFRESH_RATE_LIMIT_MS;

  const retryInMin = isRateLimited && currentLastRefreshedAt
    ? Math.ceil((REFRESH_RATE_LIMIT_MS - (Date.now() - new Date(currentLastRefreshedAt).getTime())) / 60_000)
    : 0;

  const oldestComputedAt = useMemo(() => {
    const dates = breakdownStats.map((s) => new Date(s.computedAt).getTime());
    return dates.length > 0 ? Math.min(...dates) : null;
  }, [breakdownStats]);

  function handleRefresh() {
    startTransition(async () => {
      const res = await fetch("/api/breakdown-stats", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.lastRefreshedAt) setCurrentLastRefreshedAt(data.lastRefreshedAt);
        router.refresh();
      }
    });
  }

  // Auto-refresh on mount if data is over a day old (or has never been computed)
  const handleRefreshRef = useRef(handleRefresh);
  handleRefreshRef.current = handleRefresh;
  useEffect(() => {
    const isStale =
      lastRefreshedAt === null ||
      Date.now() - new Date(lastRefreshedAt).getTime() > ONE_DAY_MS;
    if (isStale) handleRefreshRef.current();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chart data for each entity type
  const ciChartData = useMemo(() => {
    return rows
      .map((row) => {
        const id = "playerId" in row ? row.playerId : (row as GroupBreakdownRow).groupId;
        const stats = statsMap.get(`${entityType}:${id}`);
        if (!stats) return null;
        return {
          name: row.name,
          winRate: row.winRate,
          ciLow: stats.winRateCILow,
          ciHigh: stats.winRateCIHigh,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [rows, statsMap, entityType]);

  const probChartData = useMemo(() => {
    return rows
      .map((row) => {
        const id = "playerId" in row ? row.playerId : (row as GroupBreakdownRow).groupId;
        const stats = statsMap.get(`${entityType}:${id}`);
        if (!stats) return null;
        return {
          name: row.name,
          probability: stats.profitProbability * 100,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [rows, statsMap, entityType]);

  const hasStats = ciChartData.length > 0;

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/breakdowns" className="hover:text-zinc-300 transition-colors">
            Breakdowns
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Statistical Analysis</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Statistical Analysis</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Confidence intervals and probability estimates derived from your session history
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {oldestComputedAt && (
              <p className="text-xs text-zinc-600">
                Updated {formatRelativeTime(new Date(oldestComputedAt).toISOString())}
              </p>
            )}
            <button
              onClick={handleRefresh}
              disabled={isPending || isRateLimited}
              title={isRateLimited ? `Available in ${retryInMin} min` : "Recompute all statistical estimates"}
              className={clsx(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                isPending || isRateLimited
                  ? "cursor-not-allowed border-zinc-800 text-zinc-600"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              )}
            >
              <span className={clsx("text-sm leading-none", isPending && "animate-spin inline-block")}>↻</span>
              {isPending
                ? "Refreshing…"
                : isRateLimited
                  ? `Refresh (${retryInMin}m)`
                  : "Refresh stats"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mode toggle ──────────────────────────────────────────────────── */}
      <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
        <button
          onClick={() => setMode("player")}
          className={clsx(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "player" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          By Player
        </button>
        <button
          onClick={() => setMode("group")}
          className={clsx(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "group" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          By Group
        </button>
      </div>

      {!hasStats ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-400 font-medium">No statistical data yet</p>
          <p className="mt-2 text-sm text-zinc-500">
            Add or edit a session to generate estimates, or click{" "}
            <button
              onClick={handleRefresh}
              disabled={isPending || isRateLimited}
              className="underline underline-offset-2 hover:text-zinc-300 transition-colors disabled:no-underline disabled:cursor-not-allowed"
            >
              Refresh stats
            </button>{" "}
            to compute them now.
          </p>
        </div>
      ) : (
        <>
          {/* ── Win Rate Confidence Intervals ────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Win Rate Confidence Intervals</h2>
              <p className="mt-1 text-sm text-zinc-500">
                How certain are we about each win rate? The bar shows the observed win rate;
                the whiskers show the 95% confidence interval from bootstrap resampling.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <WinRateCIChart data={ciChartData} />
            </div>

            <ExplainerCard title="Bootstrap Resampling">
              <p>
                A <span className="text-zinc-200 font-medium">win rate</span> is simply the fraction
                of sessions where you ended up with a profit. If you played 10 sessions and won 6,
                your win rate is 60%. But with only 10 sessions, that 60% could easily be 45% or 75%
                if you ran those sessions again — the sample is too small to be certain.
              </p>
              <p>
                <span className="text-zinc-200 font-medium">Bootstrap resampling</span> quantifies
                that uncertainty. The method works by repeatedly drawing new fake samples of the
                same size from your actual sessions (sampling with replacement — the same session
                can be picked more than once), and computing the win rate for each fake sample.
                After 5,000 such samples, we take the 2.5th and 97.5th percentiles of those win
                rates as the lower and upper bound of the{" "}
                <span className="text-zinc-200 font-medium">95% confidence interval</span>.
              </p>
              <p>
                A wide interval means your estimate is uncertain — usually because you have few
                sessions with that player. A narrow interval means the data is telling a more
                consistent story. The true win rate has a 95% chance of falling within the shown
                range, assuming your future sessions resemble your past ones.
              </p>
            </ExplainerCard>
          </section>

          {/* ── Probability of Profit ────────────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Probability of Profit</h2>
              <p className="mt-1 text-sm text-zinc-500">
                The estimated probability that a randomly chosen future session with each
                player/group will result in a profit. Green bars are above 50%; red bars below.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <ProfitProbChart data={probChartData} />
            </div>

            <ExplainerCard title="Normal Distribution Modelling">
              <p>
                While the win rate counts the fraction of sessions with any profit, the{" "}
                <span className="text-zinc-200 font-medium">probability of profit</span> uses the
                actual profit amounts to make a more nuanced estimate. Rather than just counting
                wins, we model the distribution of session profits using a{" "}
                <span className="text-zinc-200 font-medium">normal distribution</span> — a
                bell-curve fitted to your past session results.
              </p>
              <p>
                From your sessions we compute two things: the{" "}
                <span className="text-zinc-200 font-medium">mean profit</span> (average result per
                session) and the{" "}
                <span className="text-zinc-200 font-medium">standard deviation</span> (how spread
                out the results are). We then ask: given a bell-curve with that mean and spread,
                what fraction of it sits above zero? That fraction is P(Profit).
              </p>
              <p>
                Formally, if X ~ N(μ, σ²), then P(X &gt; 0) = Φ(μ / σ), where Φ is the
                standard normal cumulative distribution function. In plain terms: the higher and
                tighter your profit distribution, the closer this value is to 100%. If your mean
                profit is negative or your variance is very large relative to your mean, it will
                be much lower.
              </p>
              <p>
                Note that this is a <span className="text-zinc-200 font-medium">parametric</span>{" "}
                estimate (it assumes a normal distribution) whereas the win-rate CI above is{" "}
                <span className="text-zinc-200 font-medium">non-parametric</span> (it makes no
                assumption about the shape of your profit distribution).
              </p>
            </ExplainerCard>
          </section>

          {/* ── Data table ───────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-100">Full Numbers</h2>
            <DataTable rows={rows} mode={mode} statsMap={statsMap} />
          </section>
        </>
      )}
    </div>
  );
}
