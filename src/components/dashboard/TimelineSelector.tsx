"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

export type Timeline = "all" | "ytd" | "last-3-months" | "this-month";

const OPTIONS: { value: Timeline; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "ytd", label: "Year to Date" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "this-month", label: "This Month" },
];

export default function TimelineSelector({
  current,
}: {
  current: Timeline;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: Timeline) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("timeline");
    } else {
      params.set("timeline", value);
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={clsx(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            current === opt.value
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
