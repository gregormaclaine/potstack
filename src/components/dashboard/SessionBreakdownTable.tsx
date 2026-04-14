import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { SessionWithPlayers } from "@/types";

interface SessionBreakdownTableProps {
  sessions: SessionWithPlayers[];
}

export default function SessionBreakdownTable({ sessions }: SessionBreakdownTableProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No sessions yet.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full">
        <thead className="border-b border-zinc-800 bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Location</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Players</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Buy-in</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {sessions.map((session) => (
            <tr key={session.id} className="bg-zinc-950 transition-colors hover:bg-zinc-900/50">
              <td className="px-4 py-3 text-sm">
                <Link href={`/sessions/${session.id}`} className="text-zinc-300 hover:text-emerald-400 transition-colors">
                  {formatDate(session.date)}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {session.location ?? <span className="text-zinc-600">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm text-zinc-400">{session.players.length}</td>
              <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(session.buyIn)}</td>
              <td className="px-4 py-3 text-right"><Badge value={session.profit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
