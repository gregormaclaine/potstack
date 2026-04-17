"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getEventColor } from "@/components/events/eventColors";
import type { PokerEvent } from "@/types";

interface EventSelectorProps {
  events: PokerEvent[];
  currentEventId: number | null;
}

export default function EventSelector({ events, currentEventId }: EventSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (events.length === 0) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === "") {
      params.delete("event");
    } else {
      params.set("event", val);
      params.delete("timeline");
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  }

  const selected = events.find((ev) => ev.id === currentEventId);
  const dotColor = selected ? getEventColor(selected.color).dot : null;

  return (
    <div className="relative flex items-center gap-2">
      {dotColor && (
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
      )}
      <select
        value={currentEventId ?? ""}
        onChange={handleChange}
        className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">All Events</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
      </select>
    </div>
  );
}
