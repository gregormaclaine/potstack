"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useFeatureFlagEnabled } from "posthog-js/react";
import Badge from "@/components/ui/Badge";
import AvgProfitChart from "@/components/breakdowns/AvgProfitChart";
import WinRateChart from "@/components/breakdowns/WinRateChart";
import { GROUP_COLORS } from "@/components/players/PlayerList";
import { buildPlayerBreakdowns, buildGroupBreakdowns } from "@/lib/breakdowns";
import { formatPercent } from "@/lib/formatters";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type {
  SessionWithPlayers,
  PlayerGroup,
  PlayerBreakdownRow,
  GroupBreakdownRow,
} from "@/types";

type SortKey = "name" | "sessions" | "totalBuyIn" | "totalCashOut" | "profit" | "avgProfit" | "maxProfit" | "maxLoss" | "winRate";
type SortDir = "asc" | "desc";

interface BreakdownsViewProps {
  sessions: SessionWithPlayers[];
  playerMetas: Record<number, { name: string; group: PlayerGroup | null }>;
  playerGroupMap: Record<number, number>;
  groups: PlayerGroup[];
}

function GroupChip({ group }: { group: PlayerGroup }) {
  const c = GROUP_COLORS[group.color] ?? GROUP_COLORS.zinc;
  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", c.bg, c.text)}>
      {group.name}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      className={clsx(
        "cursor-pointer select-none px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors",
        align === "right" ? "text-right" : "text-left"
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && (
        <span className="ml-1 text-emerald-400">{dir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

export default function BreakdownsView({
  sessions,
  playerMetas,
  playerGroupMap,
  groups,
}: BreakdownsViewProps) {
  const { formatCurrency } = useFormatCurrency();
  const statsEnabled = useFeatureFlagEnabled("stats-analysis-page");
  const [mode, setMode] = useState<"player" | "group">("player");
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const playerMetaMap = useMemo(
    () => new Map(Object.entries(playerMetas).map(([k, v]) => [Number(k), v])),
    [playerMetas]
  );
  const playerGroupMapObj = useMemo(
    () => new Map(Object.entries(playerGroupMap).map(([k, v]) => [Number(k), v])),
    [playerGroupMap]
  );

  const playerRows = useMemo(
    () => buildPlayerBreakdowns(sessions, playerMetaMap),
    [sessions, playerMetaMap]
  );
  const groupRows = useMemo(
    () => buildGroupBreakdowns(sessions, groups, playerGroupMapObj),
    [sessions, groups, playerGroupMapObj]
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortRows<T extends PlayerBreakdownRow | GroupBreakdownRow>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const aIsUngrouped = "groupId" in a && (a as GroupBreakdownRow).groupId === -1;
      const bIsUngrouped = "groupId" in b && (b as GroupBreakdownRow).groupId === -1;
      if (aIsUngrouped) return 1;
      if (bIsUngrouped) return -1;

      const av = a[sortKey as keyof T] as number | string;
      const bv = b[sortKey as keyof T] as number | string;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const sortedPlayerRows = sortRows(playerRows);
  const sortedGroupRows = sortRows(groupRows);

  const chartData = mode === "player"
    ? sortedPlayerRows.map((r) => ({ name: r.name, avgProfit: r.avgProfit, winRate: r.winRate }))
    : sortedGroupRows.map((r) => ({ name: r.name, avgProfit: r.avgProfit, winRate: r.winRate }));

  const isEmpty = mode === "player"
    ? playerRows.length === 0
    : groupRows.filter((r) => r.groupId !== -1).length === 0;

  return (
    <div className="space-y-6">
      {/* ── Header + mode toggle ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start justify-between sm:justify-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Breakdowns</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Your session stats grouped by player or group
            </p>
          </div>
          <div className="group relative mt-1.5">
            <div className="flex h-5 w-5 cursor-default items-center justify-center rounded-full border border-zinc-600 text-xs font-semibold text-zinc-400 select-none">
              ?
            </div>
            <div className="pointer-events-none absolute left-1/2 top-7 z-10 w-64 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <p>
                <span className="font-semibold text-zinc-200">By Player</span> only shows players
                who have appeared in at least 3 of your sessions.
              </p>
              <p className="mt-1">
                <span className="font-semibold text-zinc-200">By Group</span> includes a session
                under a group when at least half of the grouped players in that session belong to it.
              </p>
            </div>
          </div>
          <div className="sm:hidden ml-auto">
            <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
              <button
                onClick={() => setMode("player")}
                className={clsx(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  mode === "player"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                By Player
              </button>
              <button
                onClick={() => setMode("group")}
                className={clsx(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  mode === "group"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                By Group
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <Link
            href="/breakdowns/group-sessions"
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Group Sessions
            <span className="text-zinc-600">→</span>
          </Link>
          {statsEnabled && (
            <Link
              href="/breakdowns/stats"
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            >
              Statistical Analysis
              <span className="text-zinc-600">→</span>
            </Link>
          )}
          <div className="hidden sm:inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
            <button
              onClick={() => setMode("player")}
              className={clsx(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                mode === "player"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              By Player
            </button>
            <button
              onClick={() => setMode("group")}
              className={clsx(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                mode === "group"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              By Group
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-500">
            {mode === "group"
              ? "No groups have enough session data yet. Create groups and add players to them to see breakdowns here."
              : "No sessions recorded yet."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Stats table ───────────────────────────────────────────────── */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-max">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} align="left" />
                  {mode === "player" && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Group
                    </th>
                  )}
                  <SortHeader label="Sessions" sortKey="sessions" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Buy-in" sortKey="totalBuyIn" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Cash-out" sortKey="totalCashOut" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Profit" sortKey="profit" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Avg / Session" sortKey="avgProfit" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Max Win" sortKey="maxProfit" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Max Loss" sortKey="maxLoss" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Win Rate" sortKey="winRate" current={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {mode === "player"
                  ? sortedPlayerRows.map((row) => (
                      <tr key={row.playerId} className="bg-zinc-950 hover:bg-zinc-900/50">
                        <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
                        <td className="px-4 py-3">
                          {row.group ? <GroupChip group={row.group} /> : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">{row.sessions}</td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(row.totalBuyIn)}</td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(row.totalCashOut)}</td>
                        <td className="px-4 py-3 text-right"><Badge value={row.profit} /></td>
                        <td className="px-4 py-3 text-right"><Badge value={row.avgProfit} /></td>
                        <td className="px-4 py-3 text-right"><Badge value={row.maxProfit} /></td>
                        <td className="px-4 py-3 text-right"><Badge value={row.maxLoss} /></td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatPercent(row.winRate)}</td>
                      </tr>
                    ))
                  : sortedGroupRows.map((row) => {
                      const isUngrouped = row.groupId === -1;
                      const colors = GROUP_COLORS[row.color] ?? GROUP_COLORS.zinc;
                      return (
                        <tr key={row.groupId} className="bg-zinc-950 hover:bg-zinc-900/50">
                          <td className="px-4 py-3">
                            {isUngrouped ? (
                              <span className="inline-flex items-center rounded border border-dashed border-zinc-600 px-2 py-0.5 text-xs font-medium italic text-zinc-400">
                                {row.name}
                              </span>
                            ) : (
                              <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", colors.bg, colors.text)}>
                                {row.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-400">{row.sessions}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(row.totalBuyIn)}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(row.totalCashOut)}</td>
                          <td className="px-4 py-3 text-right"><Badge value={row.profit} /></td>
                          <td className="px-4 py-3 text-right"><Badge value={row.avgProfit} /></td>
                          <td className="px-4 py-3 text-right"><Badge value={row.maxProfit} /></td>
                          <td className="px-4 py-3 text-right"><Badge value={row.maxLoss} /></td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatPercent(row.winRate)}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* ── Charts ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Avg Profit per Session
              </h2>
              <AvgProfitChart data={chartData} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Win Rate
              </h2>
              <WinRateChart data={chartData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
