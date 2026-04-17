"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EventModal from "@/components/events/EventModal";
import EventHeader from "@/components/events/EventHeader";
import { getEventColor } from "@/components/events/eventColors";
import { GROUP_COLORS } from "@/components/players/PlayerList";
import { getSessionPredominantGroups, type SessionGroupLabel } from "@/lib/breakdowns";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { SessionWithPlayers, PokerEvent } from "@/types";

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

function SessionRow({ session, onEdit, onDelete }: {
  session: SessionWithPlayers;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <tr className="block bg-zinc-950 transition-colors hover:bg-zinc-900/50 sm:table-row">
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
      <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{session.players.length}</td>
      <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{formatCurrency(session.buyIn)}</td>
      <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">{formatCurrency(session.cashOut)}</td>
      <td className="hidden px-4 py-3 text-right sm:table-cell"><Badge value={session.profit} /></td>
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
          <Button size="sm" variant="secondary" onClick={() => onEdit(session.id)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(session.id)}>Delete</Button>
        </div>
      </td>
    </tr>
  );
}

const TABLE_HEADER = (
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
);

type RenderItem =
  | { kind: "event"; event: PokerEvent; sessions: SessionWithPlayers[]; sortDate: number }
  | { kind: "session"; session: SessionWithPlayers; sortDate: number };

type Group =
  | { kind: "event"; event: PokerEvent; sessions: SessionWithPlayers[]; sortDate: number }
  | { kind: "sessions"; sessions: SessionWithPlayers[]; sortDate: number };

interface SessionsViewProps {
  sessions: SessionWithPlayers[];
  initialEvents: PokerEvent[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SessionsView({ sessions, initialEvents, total, page, totalPages }: SessionsViewProps) {
  const router = useRouter();
  const [events, setEvents] = useState<PokerEvent[]>(initialEvents);
  const [collapsedEvents, setCollapsedEvents] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PokerEvent | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      sessionStorage.removeItem(SCROLL_KEY);
      window.scrollTo({ top: parseInt(saved), behavior: "instant" });
    }
  }, []);

  function handleEditSession(sessionId: number) {
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

  function handleEventSaved(event: PokerEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [...prev, event];
    });
  }

  function handleEventDeleted(id: number) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setCollapsedEvents((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function openEditEvent(event: PokerEvent) {
    setEditingEvent(event);
    setEventModalOpen(true);
  }

  function toggleCollapse(id: number) {
    setCollapsedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // Assign sessions to their matching event
  const eventSessions = new Map<number, SessionWithPlayers[]>();
  const ungroupedSessions: SessionWithPlayers[] = [];

  for (const session of sessions) {
    const sessionDate = new Date(session.date);
    const matchedEvent = events.find((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return sessionDate >= start && sessionDate <= end;
    });
    if (matchedEvent) {
      const list = eventSessions.get(matchedEvent.id) ?? [];
      list.push(session);
      eventSessions.set(matchedEvent.id, list);
    } else {
      ungroupedSessions.push(session);
    }
  }

  // Build chronological item list (desc)
  const items: RenderItem[] = [
    ...events
      .filter((event) => (eventSessions.get(event.id) ?? []).length > 0)
      .map((event): RenderItem => ({
        kind: "event",
        event,
        sessions: eventSessions.get(event.id) ?? [],
        sortDate: new Date(event.startDate).getTime(),
      })),
    ...ungroupedSessions.map((session): RenderItem => ({
      kind: "session",
      session,
      sortDate: new Date(session.date).getTime(),
    })),
  ].sort((a, b) => b.sortDate - a.sortDate);

  // Merge consecutive standalone sessions into groups
  const groups: Group[] = [];
  for (const item of items) {
    if (item.kind === "event") {
      groups.push({ kind: "event", event: item.event, sessions: item.sessions, sortDate: item.sortDate });
    } else {
      const last = groups[groups.length - 1];
      if (last && last.kind === "sessions") {
        last.sessions.push(item.session);
      } else {
        groups.push({ kind: "sessions", sessions: [item.session], sortDate: item.sortDate });
      }
    }
  }

  const header = (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-zinc-100">Sessions</h1>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { setEditingEvent(null); setEventModalOpen(true); }}
        >
          New Event
        </Button>
        <Link href="/sessions/new">
          <Button size="sm">New Session</Button>
        </Link>
      </div>
    </div>
  );

  const eventModalEl = (
    <EventModal
      open={eventModalOpen}
      onClose={() => { setEventModalOpen(false); setEditingEvent(null); }}
      onSaved={handleEventSaved}
      onDeleted={handleEventDeleted}
      editing={editingEvent}
    />
  );

  if (sessions.length === 0 && events.length === 0) {
    return (
      <>
        {header}
        <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
          <p className="text-zinc-500">No sessions recorded yet.</p>
          <Link href="/sessions/new">
            <Button className="mt-4">Record First Session</Button>
          </Link>
        </div>
        {eventModalEl}
      </>
    );
  }

  return (
    <>
      {header}
      <p className="mb-3 text-sm text-zinc-500">{total} session{total !== 1 ? "s" : ""}</p>

      <div className="flex flex-col gap-3">
        {groups.map((group, i) => {
          if (group.kind === "event") {
            const isCollapsed = collapsedEvents.has(group.event.id);
            const cols = getEventColor(group.event.color);
            return (
              <div
                key={`event-${group.event.id}`}
                className="overflow-hidden rounded-xl border border-zinc-800 border-l-4"
                style={{ borderLeftColor: cols.hex }}
              >
                <EventHeader
                  event={group.event}
                  sessions={group.sessions}
                  onEdit={openEditEvent}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleCollapse(group.event.id)}
                />
                {!isCollapsed && group.sessions.length > 0 && (
                  <table className="w-full border-t border-zinc-800">
                    <tbody className="divide-y divide-zinc-800">
                      {group.sessions.map((s) => (
                        <SessionRow key={s.id} session={s} onEdit={handleEditSession} onDelete={setDeletingId} />
                      ))}
                    </tbody>
                  </table>
                )}
                {!isCollapsed && group.sessions.length === 0 && (
                  <div className="border-t border-zinc-800 px-4 py-5 text-center text-sm text-zinc-600">
                    No sessions in this date range yet.
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={`sessions-${i}`} className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full">
                {TABLE_HEADER}
                <tbody className="divide-y divide-zinc-800">
                  {group.sessions.map((s) => (
                    <SessionRow key={s.id} session={s} onEdit={handleEditSession} onDelete={setDeletingId} />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

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

      {eventModalEl}
    </>
  );
}
