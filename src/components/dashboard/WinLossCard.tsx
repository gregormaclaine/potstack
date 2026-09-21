"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WinLossBarChart from "@/components/dashboard/WinLossBarChart";
import {
  allowedGroupings,
  DEFAULT_WIN_LOSS_GROUPING,
  parseGrouping,
  WIN_LOSS_GROUPING_OPTIONS,
  type WinLossGrouping,
} from "@/lib/winLossGrouping";
import type { Timeline } from "@/components/dashboard/TimelineSelector";
import type { WinLossPoint } from "@/types";

interface WinLossCardProps {
  data: WinLossPoint[];
  /** null when an event filter is active instead of a timeline. */
  timeline: Timeline | null;
}

function writeGroupingParam(
  params: URLSearchParams,
  grouping: WinLossGrouping
) {
  const next = new URLSearchParams(params.toString());
  if (grouping === DEFAULT_WIN_LOSS_GROUPING) {
    next.delete("grouping");
  } else {
    next.set("grouping", grouping);
  }
  const qs = next.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

export default function WinLossCard({ data, timeline }: WinLossCardProps) {
  const searchParams = useSearchParams();
  const [grouping, setGrouping] = useState<WinLossGrouping>(() =>
    parseGrouping(searchParams.get("grouping"))
  );

  const allowed = allowedGroupings(timeline);
  // A stale query arg (e.g. ?grouping=month left over from a wider timeline)
  // can point at a grouping that is no longer offered — fall back to default.
  const effective = allowed.includes(grouping)
    ? grouping
    : DEFAULT_WIN_LOSS_GROUPING;

  // Keep the URL honest about what's actually rendered. The component is keyed
  // on the timeline in the dashboard, so the corrected arg is what gets read
  // back when the timeline changes.
  useEffect(() => {
    if (parseGrouping(new URLSearchParams(window.location.search).get("grouping")) !== effective) {
      writeGroupingParam(new URLSearchParams(window.location.search), effective);
    }
  }, [effective]);

  function select(value: WinLossGrouping) {
    setGrouping(value);
    writeGroupingParam(new URLSearchParams(window.location.search), value);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex h-5 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-300">
          Profit / Loss per Session
        </h2>
        {allowed.length > 0 && (
          <select
            aria-label="Group profit by"
            value={effective}
            onChange={(e) => select(parseGrouping(e.target.value))}
            className="h-5 rounded border border-zinc-700 bg-zinc-800 py-0 pl-1.5 pr-1 text-[11px] leading-none font-medium text-zinc-400 transition-colors hover:text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            {WIN_LOSS_GROUPING_OPTIONS.filter((opt) =>
              allowed.includes(opt.value)
            ).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <WinLossBarChart data={data} grouping={effective} />
    </div>
  );
}
