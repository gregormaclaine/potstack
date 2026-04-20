"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import Badge from "@/components/ui/Badge";
import CumulativeProfitByPlayerChart from "@/components/breakdowns/CumulativeProfitByPlayerChart";
import { GROUP_COLORS } from "@/components/players/PlayerList";
import {
  getSessionsForGroup,
  buildGroupSessionPlayerRows,
  buildCumulativeByPlayer,
  buildGroupSessionDetails,
  type GroupSessionPlayerRow,
} from "@/lib/breakdowns";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import type { SessionWithPlayers, PlayerGroup } from "@/types";

type SortKey =
  | "name"
  | "sessions"
  | "totalBuyIn"
  | "totalCashOut"
  | "profit"
  | "avgProfit"
  | "maxProfit"
  | "maxLoss"
  | "winRate";
type SortDir = "asc" | "desc";

interface SavedGroupSearch {
  id: string;
  label: string;
  groupId: number | null;
  fromDate: string;
  toDate: string;
  strictMode: boolean;
  hiddenPlayerKeys: string[];
  extraPlayerIds: number[];
}

function loadSavedSearches(userId: number): SavedGroupSearch[] {
  try {
    const raw = localStorage.getItem(`poker-tracker:group-searches:${userId}`);
    return raw ? (JSON.parse(raw) as SavedGroupSearch[]) : [];
  } catch {
    return [];
  }
}

function storeSavedSearches(userId: number, searches: SavedGroupSearch[]): void {
  localStorage.setItem(`poker-tracker:group-searches:${userId}`, JSON.stringify(searches));
}

interface GroupSessionsViewProps {
  sessions: SessionWithPlayers[];
  playerGroupMap: Record<number, number>;
  groups: PlayerGroup[];
  players: { id: number; name: string; groupId: number | null }[];
  userId: number;
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

function NullCell() {
  return <span className="text-xs text-zinc-600">—</span>;
}

export default function GroupSessionsView({
  sessions,
  playerGroupMap,
  groups,
  players,
  userId,
}: GroupSessionsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingHiddenKeysRef = useRef<string[] | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(() => {
    const g = searchParams.get("group");
    return g ? Number(g) : null;
  });
  const [fromDate, setFromDate] = useState<string>(() => searchParams.get("from") ?? "");
  const [toDate, setToDate] = useState<string>(() => searchParams.get("to") ?? "");
  const [extraPlayerIds, setExtraPlayerIds] = useState<number[]>(() => {
    const raw = searchParams.get("extra");
    return raw ? raw.split(",").map(Number).filter(Boolean) : [];
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [strictMode, setStrictMode] = useState<boolean>(() => searchParams.get("strict") === "1");
  const [hiddenPlayerKeys, setHiddenPlayerKeys] = useState<Set<string>>(() => {
    const raw = searchParams.get("hidden");
    return raw ? new Set(raw.split(",")) : new Set();
  });
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [savedSearches, setSavedSearches] = useState<SavedGroupSearch[]>([]);

  const playerGroupMapObj = useMemo(
    () => new Map(Object.entries(playerGroupMap).map(([k, v]) => [Number(k), v])),
    [playerGroupMap]
  );

  const groupSessions = useMemo(() => {
    if (selectedGroupId === null) return [];
    return getSessionsForGroup(sessions, selectedGroupId, playerGroupMapObj);
  }, [selectedGroupId, sessions, playerGroupMapObj]);

  const dateFilteredSessions = useMemo(
    () =>
      groupSessions.filter((s) => {
        const d = s.date.slice(0, 10);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      }),
    [groupSessions, fromDate, toDate]
  );

  const extraPlayerIdSet = useMemo(() => new Set(extraPlayerIds), [extraPlayerIds]);

  const filteredSessions = useMemo(() => {
    if (!strictMode || selectedGroupId === null) return dateFilteredSessions;
    return dateFilteredSessions.filter((s) =>
      s.players.every(
        (sp) =>
          playerGroupMapObj.get(sp.playerId) === selectedGroupId ||
          extraPlayerIdSet.has(sp.playerId)
      )
    );
  }, [dateFilteredSessions, strictMode, selectedGroupId, playerGroupMapObj, extraPlayerIdSet]);

  const tableRows = useMemo(
    () =>
      selectedGroupId !== null
        ? buildGroupSessionPlayerRows(filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet)
        : [],
    [filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet]
  );

  const { points: chartPoints, players: chartPlayers } = useMemo(
    () =>
      selectedGroupId !== null
        ? buildCumulativeByPlayer(filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet)
        : { points: [], players: [] },
    [filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet]
  );

  const availableForPicker = useMemo(
    () =>
      players
        .filter((p) => p.groupId !== selectedGroupId && !extraPlayerIds.includes(p.id))
        .filter((p) => pickerQuery === "" || p.name.toLowerCase().includes(pickerQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [players, selectedGroupId, extraPlayerIds, pickerQuery]
  );

  const sessionDetails = useMemo(
    () =>
      selectedGroupId !== null
        ? buildGroupSessionDetails(filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet)
        : [],
    [filteredSessions, selectedGroupId, playerGroupMapObj, extraPlayerIdSet]
  );

  const visibleChartPlayers = useMemo(
    () => chartPlayers.filter((p) => !hiddenPlayerKeys.has(p.key)),
    [chartPlayers, hiddenPlayerKeys]
  );

  const sortedRows = useMemo(() => {
    return [...tableRows]
      .filter((r) => !hiddenPlayerKeys.has(r.key))
      .sort((a: GroupSessionPlayerRow, b: GroupSessionPlayerRow) => {
        const av = (a[sortKey as keyof GroupSessionPlayerRow] as number | string | null) ?? (sortDir === "desc" ? -Infinity : Infinity);
        const bv = (b[sortKey as keyof GroupSessionPlayerRow] as number | string | null) ?? (sortDir === "desc" ? -Infinity : Infinity);
        const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [tableRows, hiddenPlayerKeys, sortKey, sortDir]);

  // Load saved searches from localStorage on mount
  useEffect(() => {
    setSavedSearches(loadSavedSearches(userId));
  }, [userId]);

  // Reset hidden players and extra players when group changes, unless a saved search is being applied
  useEffect(() => {
    if (pendingHiddenKeysRef.current !== null) {
      setHiddenPlayerKeys(new Set(pendingHiddenKeysRef.current));
      pendingHiddenKeysRef.current = null;
    } else {
      setHiddenPlayerKeys(new Set());
      setExtraPlayerIds([]);
    }
  }, [selectedGroupId]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setPickerQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  // Sync all filter state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGroupId !== null) params.set("group", String(selectedGroupId));
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (extraPlayerIds.length > 0) params.set("extra", extraPlayerIds.join(","));
    if (strictMode) params.set("strict", "1");
    if (hiddenPlayerKeys.size > 0) params.set("hidden", [...hiddenPlayerKeys].join(","));
    const qs = params.toString();
    router.replace(
      qs ? `/breakdowns/group-sessions?${qs}` : "/breakdowns/group-sessions",
      { scroll: false }
    );
  }, [selectedGroupId, fromDate, toDate, extraPlayerIds, strictMode, hiddenPlayerKeys, router]);

  function autoLabel(): string {
    const group = groups.find((g) => g.id === selectedGroupId);
    const parts: string[] = [group?.name ?? "Unknown group"];
    if (fromDate || toDate) {
      const from = fromDate ? formatDate(fromDate, "d MMM yy") : "…";
      const to = toDate ? formatDate(toDate, "d MMM yy") : "…";
      parts.push(`${from} – ${to}`);
    }
    if (hiddenPlayerKeys.size > 0) parts.push(`${hiddenPlayerKeys.size} hidden`);
    if (extraPlayerIds.length > 0) parts.push(`${extraPlayerIds.length} guests`);
    return parts.join(" · ");
  }

  function startSaving() {
    setSaveLabel(autoLabel());
    setSavingSearch(true);
  }

  function confirmSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const label = saveLabel.trim() || autoLabel();
    const search: SavedGroupSearch = {
      id: String(Date.now()),
      label,
      groupId: selectedGroupId,
      fromDate,
      toDate,
      strictMode,
      hiddenPlayerKeys: [...hiddenPlayerKeys],
      extraPlayerIds,
    };
    const updated = [...savedSearches, search];
    setSavedSearches(updated);
    storeSavedSearches(userId, updated);
    setSavingSearch(false);
    setSaveLabel("");
  }

  function deleteSearch(id: string) {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    storeSavedSearches(userId, updated);
  }

  function applySearch(search: SavedGroupSearch) {
    pendingHiddenKeysRef.current = search.hiddenPlayerKeys;
    setSelectedGroupId(search.groupId);
    setFromDate(search.fromDate);
    setToDate(search.toDate);
    setExtraPlayerIds(search.extraPlayerIds ?? []);
    setStrictMode(search.strictMode ?? false);
  }

  function labelFor(search: SavedGroupSearch): string {
    return search.label || autoLabel();
  }

  function addExtraPlayer(id: number) {
    setExtraPlayerIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPickerOpen(false);
    setPickerQuery("");
  }

  function removeExtraPlayer(id: number) {
    setExtraPlayerIds((prev) => prev.filter((p) => p !== id));
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function togglePlayer(key: string) {
    setHiddenPlayerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const totalGroupNet = sessionDetails.reduce((s, r) => s + r.groupNet, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Group Sessions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Session stats and profit trajectories for a player group
          </p>
        </div>
        <Link
          href="/breakdowns"
          className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 self-start"
        >
          <span className="text-zinc-600">←</span>
          Back to Breakdowns
        </Link>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        {/* Group selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Group</span>
          {groups.map((g) => {
            const colors = GROUP_COLORS[g.color] ?? GROUP_COLORS.zinc;
            const isSelected = selectedGroupId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors border",
                  isSelected
                    ? clsx(colors.bg, colors.text, "border-transparent")
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                )}
              >
                {g.name}
              </button>
            );
          })}
          {groups.length === 0 && (
            <span className="text-sm text-zinc-600">No groups yet</span>
          )}
        </div>

        {/* Date range + strict mode */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          {selectedGroupId !== null && (
            <button
              onClick={() => setStrictMode((v) => !v)}
              className={clsx(
                "ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                strictMode
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              )}
            >
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  strictMode ? "bg-emerald-400" : "bg-zinc-600"
                )}
              />
              Strict (group only)
            </button>
          )}
        </div>

        {/* Extra player picker — only when a group is selected */}
        {selectedGroupId !== null && (
          <div className="flex flex-wrap items-center gap-2">
            {extraPlayerIds.map((id) => {
              const p = players.find((pl) => pl.id === id);
              if (!p) return null;
              return (
                <span key={id} className="flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800 pl-3 pr-1.5 py-1 text-xs text-zinc-300">
                  {p.name}
                  <button
                    onClick={() => removeExtraPlayer(id)}
                    className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-zinc-600 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-300 transition-colors"
              >
                + Add players
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-8 z-20 w-56 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
                  <div className="p-2 border-b border-zinc-800">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search players..."
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                      className="w-full rounded-md bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {availableForPicker.length === 0 && (
                      <li className="px-3 py-2 text-xs text-zinc-600">No players found</li>
                    )}
                    {availableForPicker.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => addExtraPlayer(p.id)}
                          className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Saved searches bar */}
      {(savedSearches.length > 0 || selectedGroupId !== null) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Saved</span>
          {savedSearches.map((s) => (
            <div
              key={s.id}
              className="flex items-center rounded-full border border-zinc-700 bg-zinc-900 pl-3 pr-1.5 py-1 text-xs"
            >
              <button
                onClick={() => applySearch(s)}
                className="text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                {labelFor(s)}
              </button>
              <button
                onClick={() => deleteSearch(s.id)}
                className="ml-2 text-zinc-600 hover:text-red-400 transition-colors leading-none"
              >
                ×
              </button>
            </div>
          ))}
          {selectedGroupId !== null && (
            savingSearch ? (
              <form onSubmit={confirmSave} className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder="Name this search…"
                  className="w-40 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md border border-emerald-700 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setSavingSearch(false)}
                  className="px-1.5 py-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={startSaving}
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ★ Save search
              </button>
            )
          )}
        </div>
      )}

      {/* Empty states */}
      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-500">
            No groups yet.{" "}
            <Link href="/players" className="text-emerald-400 hover:underline">
              Create a group
            </Link>{" "}
            to get started.
          </p>
        </div>
      )}
      {groups.length > 0 && selectedGroupId === null && (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-500">Select a group above to view session breakdowns.</p>
        </div>
      )}
      {selectedGroupId !== null && filteredSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-500">
            No sessions found for this group
            {strictMode ? " (strict mode is on — only pure-group sessions are shown)" : ""}.
          </p>
        </div>
      )}

      {/* Main content */}
      {selectedGroupId !== null && filteredSessions.length > 0 && (
        <>
          {/* Breakdown table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-max">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} align="left" />
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
                {sortedRows.map((row) => (
                  <tr key={row.key} className="bg-zinc-950 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium">
                      {row.isMe ? (
                        <span className="font-semibold text-emerald-400">You</span>
                      ) : (
                        <span className="text-zinc-100">{row.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">{row.sessions}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {row.totalBuyIn !== null ? formatCurrency(row.totalBuyIn) : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {row.totalCashOut !== null ? formatCurrency(row.totalCashOut) : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.profit !== null ? <Badge value={row.profit} /> : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.avgProfit !== null ? <Badge value={row.avgProfit} /> : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.maxProfit !== null ? <Badge value={row.maxProfit} /> : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.maxLoss !== null ? <Badge value={row.maxLoss} /> : <NullCell />}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">
                      {row.winRate !== null ? formatPercent(row.winRate) : <NullCell />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart + Session side table */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            {/* Cumulative chart */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">
                Cumulative Profit by Player
              </h2>
              {/* Player visibility toggles */}
              <div className="mb-3 flex flex-wrap gap-2">
                {chartPlayers.map((p) => {
                  const hidden = hiddenPlayerKeys.has(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePlayer(p.key)}
                      className={clsx(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        hidden
                          ? "border-zinc-700 text-zinc-600"
                          : "border-zinc-600 text-zinc-200"
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: hidden ? "#52525b" : p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <CumulativeProfitByPlayerChart
                points={chartPoints}
                players={visibleChartPlayers}
              />
            </div>

            {/* Session side table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-300">Sessions</h2>
              <div className="overflow-y-auto max-h-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="pb-2 text-left font-medium">Date</th>
                      <th className="pb-2 text-right font-medium">Players</th>
                      <th className="pb-2 text-right font-medium">On Table</th>
                      <th className="pb-2 text-right font-medium">Group Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionDetails.map((s) => (
                      <tr key={s.sessionId} className="border-b border-zinc-800/50">
                        <td className="py-1.5 text-zinc-400">
                          {formatDate(s.date, "d MMM yy")}
                        </td>
                        <td className="py-1.5 text-right text-zinc-400">
                          {s.totalPlayers}
                          {s.nonGroupPlayers > 0 && (
                            <span className="ml-1 text-zinc-600">
                              ({s.nonGroupPlayers} out)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-zinc-400">
                          {formatCurrency(s.totalOnTable)}
                        </td>
                        <td className="py-1.5 text-right">
                          <Badge value={s.groupNet} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Summary */}
              <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                <span>{sessionDetails.length} sessions</span>
                <div className="flex items-center gap-1">
                  <span>Net:</span>
                  <Badge value={totalGroupNet} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
