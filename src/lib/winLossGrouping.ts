import { endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { WinLossPoint } from "@/types";
import type { Timeline } from "@/components/dashboard/TimelineSelector";

export type WinLossGrouping = "session" | "week" | "month";

export const WIN_LOSS_GROUPING_OPTIONS: {
  value: WinLossGrouping;
  label: string;
}[] = [
  { value: "session", label: "Per Session" },
  { value: "week", label: "By Week" },
  { value: "month", label: "By Month" },
];

export const DEFAULT_WIN_LOSS_GROUPING: WinLossGrouping = "session";

/**
 * Which groupings make sense for the dashboard's current date filter. A null
 * timeline means an event is selected, which is always per-session. An empty
 * list means the selector should be hidden.
 */
export function allowedGroupings(timeline: Timeline | null): WinLossGrouping[] {
  if (timeline === "all" || timeline === "ytd") {
    return ["session", "week", "month"];
  }
  if (timeline === "last-3-months") return ["session", "week"];
  return [];
}

export function parseGrouping(value: string | null): WinLossGrouping {
  return value === "week" || value === "month"
    ? value
    : DEFAULT_WIN_LOSS_GROUPING;
}

export interface WinLossBucket {
  /** Unique category value for the x-axis. */
  key: string;
  /** Short label shown on the x-axis. */
  tick: string;
  /** Full label shown in the tooltip. */
  label: string;
  profit: number;
}

function bucketStart(date: Date, grouping: WinLossGrouping): Date {
  if (grouping === "week") return startOfWeek(date, { weekStartsOn: 1 });
  return startOfMonth(date);
}

function bucketLabels(
  start: Date,
  grouping: WinLossGrouping
): { tick: string; label: string } {
  if (grouping === "week") {
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return {
      tick: format(start, "d MMM"),
      label: `${format(start, "d MMM yyyy")} - ${format(end, "d MMM yyyy")}`,
    };
  }
  return { tick: format(start, "MMM yy"), label: format(start, "MMMM yyyy") };
}

/**
 * Collapse per-session profits into the buckets the chart draws. Periods
 * without any sessions are omitted rather than drawn as empty bars.
 */
export function groupWinLossPoints(
  data: WinLossPoint[],
  grouping: WinLossGrouping
): WinLossBucket[] {
  if (grouping === "session") {
    return data.map((point, i) => ({
      key: `s${point.sessionId}-${i}`,
      tick: format(parseISO(point.date), "d MMM"),
      label: format(parseISO(point.date), "d MMM yyyy"),
      profit: point.profit,
    }));
  }

  const buckets = new Map<string, WinLossBucket>();

  for (const point of data) {
    const start = bucketStart(parseISO(point.date), grouping);
    const key = format(start, "yyyy-MM-dd");
    const existing = buckets.get(key);
    if (existing) {
      existing.profit += point.profit;
    } else {
      buckets.set(key, {
        key,
        ...bucketLabels(start, grouping),
        profit: point.profit,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
}
