"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { GROUP_COLORS } from "@/components/players/PlayerList";
import { getSessionPredominantGroups, type SessionGroupLabel } from "@/lib/breakdowns";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { SessionWithPlayers } from "@/types";

function GroupChip({ group }: { group: SessionGroupLabel }) {
  const isUngrouped = group.id === null;
  if (isUngrouped) {
    return (
      <span className="inline-flex items-center rounded border border-dashed border-zinc-600 px-1.5 py-0.5 text-xs font-medium italic text-zinc-400">
        Ungrouped
      </span>
    );
  }
  const c = GROUP_COLORS[group.color] ?? GROUP_COLORS.zinc;
  return (
    <span className={clsx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", c.bg, c.text)}>
      {group.name}
    </span>
  );
}

const SCROLL_KEY = "sessions_scroll";

interface SessionTableProps {
  sessions: SessionWithPlayers[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SessionTable({
  sessions,
  total,
  page,
  totalPages,
}: SessionTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      sessionStorage.removeItem(SCROLL_KEY);
      window.scrollTo({ top: parseInt(saved), behavior: "instant" });
    }
  }, []);

  function handleEdit(sessionId: number) {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    router.push(`/sessions/${sessionId}/edit?page=${page}`);
  }

  async function confirmDelete(id: number) {
    setDeleting(true);
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setDeletingId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
        <p className="text-zinc-500">No sessions recorded yet.</p>
        <Link href="/sessions/new">
          <Button className="mt-4">Record First Session</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-zinc-500">
        {total} session{total !== 1 ? "s" : ""}
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead className="hidden border-b border-zinc-800 bg-zinc-900 sm:table-header-group">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Location</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Players</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Buy-in</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Cash-out</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Profit</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sessions.map((session) => (
              <tr key={session.id} className="block bg-zinc-950 transition-colors hover:bg-zinc-900/50 sm:table-row">
                {/* Mobile: top row — date + profit */}
                <td className="block px-4 pt-3 pb-0 sm:table-cell sm:py-3 sm:pb-3">
                  <div className="flex items-center justify-between sm:block">
                    <span className="text-sm text-zinc-300">{formatDate(session.date)}</span>
                    <span className="sm:hidden"><Badge value={session.profit} /></span>
                  </div>
                </td>
                <td className="block px-4 py-1 text-sm text-zinc-400 sm:table-cell sm:py-3">
                  {session.location ?? <span className="text-zinc-600">—</span>}
                  {(() => {
                    const groups = getSessionPredominantGroups(session.players);
                    if (groups.length === 0) return null;
                    return (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {groups.map((g: SessionGroupLabel) => <GroupChip key={g.id ?? "ungrouped"} group={g} />)}
                      </div>
                    );
                  })()}
                </td>
                {/* Mobile: stats row */}
                <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{session.players.length}</td>
                <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{formatCurrency(session.buyIn)}</td>
                <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{formatCurrency(session.cashOut)}</td>
                <td className="hidden px-4 py-3 text-right sm:table-cell"><Badge value={session.profit} /></td>
                {/* Mobile: inline stats */}
                <td className="block px-4 py-1 sm:hidden">
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span><span className="text-zinc-600">Players:</span> {session.players.length}</span>
                    <span><span className="text-zinc-600">Buy-in:</span> {formatCurrency(session.buyIn)}</span>
                    <span><span className="text-zinc-600">Cash-out:</span> {formatCurrency(session.cashOut)}</span>
                  </div>
                </td>
                <td className="block px-4 pb-3 pt-2 sm:table-cell sm:py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/sessions/${session.id}`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(session.id)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeletingId(session.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Link href={`/sessions?page=${page - 1}`} className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
            <Button variant="secondary" size="sm" disabled={page <= 1}>Previous</Button>
          </Link>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <Link href={`/sessions?page=${page + 1}`} className={page >= totalPages ? "pointer-events-none opacity-40" : ""}>
            <Button variant="secondary" size="sm" disabled={page >= totalPages}>Next</Button>
          </Link>
        </div>
      )}

      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Delete Session">
        <p className="mb-4 text-sm text-zinc-400">
          Are you sure you want to delete this session? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => deletingId && confirmDelete(deletingId)}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
