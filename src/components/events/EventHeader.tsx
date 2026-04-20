"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { getEventColor } from "./eventColors";
import { formatDate } from "@/lib/formatters";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type { PokerEvent, SessionWithPlayers } from "@/types";

interface EventHeaderProps {
  event: PokerEvent;
  sessions: SessionWithPlayers[];
  onEdit: (event: PokerEvent) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function EventHeader({ event, sessions, onEdit, isCollapsed, onToggleCollapse }: EventHeaderProps) {
  const { formatCurrency } = useFormatCurrency();
  const router = useRouter();
  const cols = getEventColor(event.color);

  const totalProfit = sessions.reduce((sum, s) => sum + s.profit, 0);
  const totalSessions = sessions.length;
  const totalBuyIn = sessions.reduce((sum, s) => sum + s.buyIn, 0);

  return (
    <div className="bg-zinc-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleCollapse}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <span className={clsx("inline-block text-xs transition-transform", isCollapsed ? "-rotate-90" : "rotate-0")}>▼</span>
          </button>
          <button
            onClick={() => router.push(`/dashboard?event=${event.id}`)}
            className="flex items-center gap-1.5 group"
          >
            <span className={clsx("text-sm font-semibold transition-colors group-hover:opacity-80", cols.text)}>
              {event.name}
            </span>
            <span className="text-xs text-zinc-500 transition-colors group-hover:text-zinc-400">↗</span>
          </button>
        </div>
        <button
          onClick={() => onEdit(event)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
        <span>{formatDate(event.startDate, "d MMM yyyy")} – {formatDate(event.endDate, "d MMM yyyy")}</span>
        <span>{totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
        <span>Buy-in {formatCurrency(totalBuyIn)}</span>
        <span className={totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
          {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
        </span>
      </div>
    </div>
  );
}
