"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type {
  NotificationRow,
  NotificationData,
  LinkRequestReceivedData,
  SessionInviteReceivedData,
  ResolvedPlayer,
  UnresolvedPlayer,
  PlayerMapping,
  DuplicateSessionInfo,
} from "@/types";

// ── Player combobox ───────────────────────────────────────────────────────────

interface ComboboxPlayer { id: number; name: string }

function PlayerCombobox({
  players,
  value,
  onChange,
  onConfirm,
  placeholder,
}: {
  players: ComboboxPlayer[];
  value: ComboboxPlayer | null;
  onChange: (p: ComboboxPlayer | null) => void;
  onConfirm?: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const matched = players.filter(
    (p) => !trimmed || p.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = matched.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const showAdd = trimmed.length > 0 && !exactMatch;
  const options: ComboboxPlayer[] = showAdd ? [...matched, { id: -1, name: trimmed }] : matched;
  const isOpen = open && options.length > 0;

  function select(opt: ComboboxPlayer) {
    onChange(opt);
    setQuery(opt.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0) { select(options[activeIndex]); return; }
      if (value && onConfirm) { onConfirm(); return; }
      if (trimmed && matched.length === 0) { select({ id: -1, name: trimmed }); return; }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Search or type a new player name…"}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      {isOpen && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {options.map((opt, i) => (
            <li key={opt.id}>
              <button
                type="button"
                onMouseDown={() => select(opt)}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  i === activeIndex ? "bg-emerald-700 text-white"
                    : opt.id === -1 ? "text-emerald-400 hover:bg-zinc-800"
                    : "text-zinc-200 hover:bg-zinc-800"
                )}
              >
                {opt.id === -1
                  ? <span className="flex items-center gap-1"><span className="text-emerald-400">+</span> Create &ldquo;{trimmed}&rdquo;</span>
                  : opt.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={clsx(
      "rounded-full px-2 py-0.5 text-xs font-medium",
      status === "ACCEPTED" && "bg-emerald-600/20 text-emerald-400",
      status === "PENDING"  && "bg-yellow-600/20 text-yellow-400",
      status === "REJECTED" && "bg-red-600/20 text-red-400",
    )}>
      {status === "ACCEPTED" ? "Accepted" : status === "PENDING" ? "Pending" : "Rejected"}
    </span>
  );
}

/** Renders a session date as a clickable link, or greyed-out with a tooltip if the session is gone. */
function SessionLink({ sessionId, date }: { sessionId: number | null; date: string }) {
  const label = formatDate(date);
  if (sessionId !== null) {
    return (
      <Link href={`/sessions/${sessionId}`} className="text-zinc-200 underline underline-offset-2 hover:text-white">
        {label}
      </Link>
    );
  }
  return (
    <span className="relative group cursor-default text-zinc-500 line-through">
      {label}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Session no longer exists
      </span>
    </span>
  );
}

// ── Invite accept state machine ───────────────────────────────────────────────

type InviteAcceptPhase =
  | { phase: "idle" }
  | { phase: "resolving"; isOverwrite: boolean; existingSessionId?: number }
  | { phase: "mapping"; resolved: ResolvedPlayer[]; unresolved: UnresolvedPlayer[]; mappings: Record<number, ComboboxPlayer | null>; isOverwrite: boolean; existingSessionId?: number }
  | { phase: "submitting" };

type DuplicateCheckState =
  | { status: "checking" }
  | { status: "done"; result: DuplicateSessionInfo | null };

// ── Props ─────────────────────────────────────────────────────────────────────

interface MyPlayer { id: number; name: string }

interface NotificationsFeedProps {
  notifications: NotificationRow[];
  myPlayers: MyPlayer[];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationsFeed({ notifications, myPlayers }: NotificationsFeedProps) {
  const [loadingAction, setLoadingAction] = useState<{ notifId: number; button: string } | null>(null);

  // Link accept flow
  const [acceptingLinkNotifId, setAcceptingLinkNotifId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ComboboxPlayer | null>(null);
  const [pickError, setPickError] = useState("");

  // Invite accept state machine (per notification id)
  const [inviteAcceptStates, setInviteAcceptStates] = useState<Record<number, InviteAcceptPhase>>({});
  const [inviteError, setInviteError] = useState<Record<number, string>>({});

  // Duplicate session check results (per notification id), populated client-side on mount
  const [duplicateChecks, setDuplicateChecks] = useState<Record<number, DuplicateCheckState>>({});

  // Optimistic notification list (allows removing/replacing in-place)
  const [notifList, setNotifList] = useState<NotificationRow[]>(notifications);

  useEffect(() => {
    const pending = notifications.filter(
      (n) => n.type === "session_invite_received" && n.invite?.status === "PENDING" && n.inviteId !== null
    );
    if (pending.length === 0) return;

    setDuplicateChecks(
      Object.fromEntries(pending.map((n) => [n.id, { status: "checking" } as DuplicateCheckState]))
    );

    for (const n of pending) {
      fetch(`/api/invites/${n.inviteId}/duplicate`)
        .then((res) => (res.ok ? res.json() : null))
        .then((result: DuplicateSessionInfo | null) => {
          setDuplicateChecks((prev) => ({ ...prev, [n.id]: { status: "done", result } }));
        })
        .catch(() => {
          setDuplicateChecks((prev) => ({ ...prev, [n.id]: { status: "done", result: null } }));
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replaceNotif(id: number, replacement: NotificationRow | null) {
    setNotifList((prev) =>
      replacement
        ? prev.map((n) => (n.id === id ? replacement : n))
        : prev.filter((n) => n.id !== id)
    );
  }

  function getInvitePhase(id: number): InviteAcceptPhase {
    return inviteAcceptStates[id] ?? { phase: "idle" };
  }
  function setInvitePhase(id: number, phase: InviteAcceptPhase) {
    setInviteAcceptStates((prev) => ({ ...prev, [id]: phase }));
  }

  // ── Link accept ────────────────────────────────────────────────────────────

  async function confirmAcceptLink(notifId: number, linkId: number, data: LinkRequestReceivedData) {
    setPickError("");
    if (!selectedPlayer) { setPickError("Please select or create a player."); return; }

    setLoadingAction({ notifId, button: "confirm" });
    try {
      const isCreating = selectedPlayer.id === -1;
      const body: Record<string, unknown> = { action: "accept" };
      if (isCreating) { body.newPlayerName = selectedPlayer.name; }
      else { body.targetPlayerId = selectedPlayer.id; }

      const res = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) { setPickError(resData.error ?? "Failed to accept"); return; }

      // Replace with accepted notification optimistically
      replaceNotif(notifId, {
        ...notifList.find((n) => n.id === notifId)!,
        type: "link_accepted",
        data: { type: "link_accepted", otherUsername: data.requesterUsername, myPlayerName: selectedPlayer.name },
        link: { status: "ACCEPTED" },
      });
      setAcceptingLinkNotifId(null);
    } finally {
      setLoadingAction(null);
    }
  }

  async function rejectLink(notifId: number, linkId: number, data: LinkRequestReceivedData) {
    setLoadingAction({ notifId, button: "reject" });
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) return;

      replaceNotif(notifId, {
        ...notifList.find((n) => n.id === notifId)!,
        type: "link_rejected_received",
        data: { type: "link_rejected_received", otherUsername: data.requesterUsername, playerName: data.playerName },
        link: { status: "REJECTED" },
      });
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Invite accept ──────────────────────────────────────────────────────────

  async function startInviteAccept(notifId: number, inviteId: number, isOverwrite: boolean, existingSessionId?: number, button = "accept") {
    setInvitePhase(notifId, { phase: "resolving", isOverwrite, existingSessionId });
    setInviteError((prev) => ({ ...prev, [notifId]: "" }));

    try {
      const res = await fetch(`/api/invites/${inviteId}/players`);
      if (!res.ok) { setInvitePhase(notifId, { phase: "idle" }); return; }
      const data: { resolved: ResolvedPlayer[]; unresolved: UnresolvedPlayer[] } = await res.json();

      if (data.unresolved.length === 0) {
        await submitInviteAccept(notifId, inviteId, data.resolved, [], isOverwrite, existingSessionId, button);
      } else {
        setInvitePhase(notifId, { phase: "mapping", resolved: data.resolved, unresolved: data.unresolved, mappings: {}, isOverwrite, existingSessionId });
      }
    } catch {
      setInvitePhase(notifId, { phase: "idle" });
    }
  }

  async function submitInviteAccept(
    notifId: number,
    inviteId: number,
    _resolved: ResolvedPlayer[],
    unresolvedMappings: Array<{ fromPlayerId: number; player: ComboboxPlayer | null }>,
    isOverwrite = false,
    existingSessionId?: number,
  ) {
    setInvitePhase(notifId, { phase: "submitting" });
    setLoadingId(notifId);

    const playerMappings: PlayerMapping[] = unresolvedMappings
      .filter((m) => m.player !== null)
      .map((m) => {
        const p = m.player!;
        if (p.id === -1) return { fromPlayerId: m.fromPlayerId, newPlayerName: p.name };
        return { fromPlayerId: m.fromPlayerId, toPlayerId: p.id };
      });

    const action = isOverwrite ? "overwrite" : "accept";
    const body: { action: string; playerMappings: PlayerMapping[]; existingSessionId?: number } = { action, playerMappings };
    if (isOverwrite && existingSessionId !== undefined) body.existingSessionId = existingSessionId;

    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setInviteError((prev) => ({ ...prev, [notifId]: data.error ?? "Failed to accept" }));
        setInvitePhase(notifId, inviteAcceptStates[notifId] ?? { phase: "idle" });
        return;
      }
      const resData: { sessionId: number } = await res.json();
      const notif = notifList.find((n) => n.id === notifId);
      if (notif && notif.data.type === "session_invite_received") {
        const d = notif.data;
        replaceNotif(notifId, {
          ...notif,
          type: "session_invite_accepted_by_me",
          data: { type: "session_invite_accepted_by_me", otherUsername: d.inviterUsername, sessionDate: d.sessionDate, sessionLocation: d.sessionLocation },
          sessionId: resData.sessionId,
          invite: { status: "ACCEPTED" },
        });
      }
      setInvitePhase(notifId, { phase: "idle" });
    } finally {
      setLoadingId(null);
    }
  }

  async function rejectInvite(notifId: number, inviteId: number) {
    setLoadingId(notifId);
    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) return;

      const notif = notifList.find((n) => n.id === notifId);
      if (notif && notif.data.type === "session_invite_received") {
        const d = notif.data;
        replaceNotif(notifId, {
          ...notif,
          type: "session_invite_rejected_by_me",
          data: { type: "session_invite_rejected_by_me", otherUsername: d.inviterUsername, sessionDate: d.sessionDate, sessionLocation: d.sessionLocation },
          invite: { status: "REJECTED" },
        });
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (notifList.length === 0) {
    return <div className="py-16 text-center text-zinc-500">No notifications yet.</div>;
  }

  return (
    <ul className="space-y-3">
      {notifList.map((notif) => {
        const { id, type, data, sessionId, link, invite, createdAt } = notif;
        const isLoading = loadingId === id;

        // ── Link request received (actionable) ────────────────────────────────
        if (type === "link_request_received") {
          const d = data as LinkRequestReceivedData & { type: "link_request_received" };
          const linkPending = link?.status === "PENDING";
          const isAccepting = acceptingLinkNotifId === id;
          const linkId = notif.linkId ?? 0;

          return (
            <LinkRequestReceivedCard
              key={id}
              notif={notif}
              d={d}
              linkPending={linkPending}
              isAccepting={isAccepting}
              isLoading={isLoading}
              myPlayers={myPlayers}
              selectedPlayer={selectedPlayer}
              pickError={pickError}
              onStartAccept={() => { setAcceptingLinkNotifId(id); setSelectedPlayer(null); setPickError(""); }}
              onCancelAccept={() => { setAcceptingLinkNotifId(null); setPickError(""); }}
              onPlayerChange={(p) => { setSelectedPlayer(p); setPickError(""); }}
              onConfirmAccept={() => confirmAcceptLink(id, linkId, d)}
              onReject={() => rejectLink(id, linkId, d)}
            />
          );
        }

        // ── Session invite received (actionable) ──────────────────────────────
        if (type === "session_invite_received") {
          const d = data as SessionInviteReceivedData & { type: "session_invite_received" };
          const invitePending = invite?.status === "PENDING";
          const invitePhase = getInvitePhase(id);
          const err = inviteError[id];

          return (
            <SessionInviteReceivedCard
              key={id}
              notif={notif}
              d={d}
              sessionId={sessionId}
              invitePending={invitePending}
              invitePhase={invitePhase}
              isLoading={isLoading}
              myPlayers={myPlayers}
              error={err}
              createdAt={createdAt}
              duplicateCheck={duplicateChecks[id]}
              onStartAccept={(isOverwrite, existingSessionId) => {
                if (notif.inviteId !== null) startInviteAccept(id, notif.inviteId!, isOverwrite, existingSessionId);
              }}
              onReject={() => { if (notif.inviteId !== null) rejectInvite(id, notif.inviteId!); }}
              onMappingChange={(fromPlayerId, player) => {
                setInviteAcceptStates((prev) => {
                  const cur = prev[id];
                  if (!cur || cur.phase !== "mapping") return prev;
                  return { ...prev, [id]: { ...cur, mappings: { ...cur.mappings, [fromPlayerId]: player } } };
                });
              }}
              onCancelMapping={() => setInvitePhase(id, { phase: "idle" })}
              onSubmitMapping={() => {
                if (invitePhase.phase !== "mapping") return;
                submitInviteAccept(
                  id, notif.inviteId!, invitePhase.resolved,
                  invitePhase.unresolved.map((u) => ({ fromPlayerId: u.fromPlayerId, player: invitePhase.mappings[u.fromPlayerId] ?? null })),
                  invitePhase.isOverwrite, invitePhase.existingSessionId,
                );
              }}
            />
          );
        }

        // ── All other notification types (display-only) ───────────────────────
        return (
          <li key={id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm text-zinc-300">
                  <NotificationText data={data} sessionId={sessionId} />
                </p>
                <p className="text-xs text-zinc-600">{timeAgo(createdAt)}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── NotificationText — maps every non-actionable type to its message ──────────

function NotificationText({ data, sessionId }: { data: NotificationData; sessionId: number | null }) {
  switch (data.type) {
    case "link_accepted":
      return <>You linked <span className="font-medium text-zinc-100">@{data.otherUsername}</span> to your player <span className="font-medium text-zinc-100">&ldquo;{data.myPlayerName}&rdquo;</span></>;

    case "link_rejected_sent":
      return <><span className="font-medium text-zinc-100">@{data.otherUsername}</span> rejected your link request for <span className="font-medium text-zinc-100">&ldquo;{data.playerName}&rdquo;</span></>;

    case "link_rejected_received":
      return <>You rejected <span className="font-medium text-zinc-100">@{data.otherUsername}</span>&apos;s link request for <span className="font-medium text-zinc-100">&ldquo;{data.playerName}&rdquo;</span></>;

    case "link_broken":
      return <>Your link with <span className="font-medium text-zinc-100">@{data.otherUsername}</span> has been broken <span className="text-zinc-500">(your &ldquo;{data.myPlayerName}&rdquo; ↔ their &ldquo;{data.theirPlayerName}&rdquo;)</span></>;

    case "session_invite_accepted":
      return <><span className="font-medium text-zinc-100">@{data.otherUsername}</span> accepted your session from <SessionLink sessionId={sessionId} date={data.sessionDate} /></>;

    case "session_invite_accepted_by_me":
      return <>You accepted <span className="font-medium text-zinc-100">@{data.otherUsername}</span>&apos;s session from <SessionLink sessionId={sessionId} date={data.sessionDate} /></>;

    case "session_invite_rejected":
      return <><span className="font-medium text-zinc-100">@{data.otherUsername}</span> rejected your session from <SessionLink sessionId={sessionId} date={data.sessionDate} /></>;

    case "session_invite_rejected_by_me":
      return <>You rejected <span className="font-medium text-zinc-100">@{data.otherUsername}</span>&apos;s session from <SessionLink sessionId={null} date={data.sessionDate} /></>;

    default:
      return null;
  }
}

// ── LinkRequestReceivedCard ───────────────────────────────────────────────────

function LinkRequestReceivedCard({
  notif,
  d,
  linkPending,
  isAccepting,
  isLoading,
  myPlayers,
  selectedPlayer,
  pickError,
  onStartAccept,
  onCancelAccept,
  onPlayerChange,
  onConfirmAccept,
  onReject,
}: {
  notif: NotificationRow;
  d: LinkRequestReceivedData;
  linkPending: boolean;
  isAccepting: boolean;
  isLoading: boolean;
  myPlayers: { id: number; name: string }[];
  selectedPlayer: ComboboxPlayer | null;
  pickError: string;
  onStartAccept: () => void;
  onCancelAccept: () => void;
  onPlayerChange: (p: ComboboxPlayer | null) => void;
  onConfirmAccept: (linkId: number) => void;
  onReject: (linkId: number) => void;
}) {
  // linkId is stored on the notification row — we surface it via notif.linkId
  // (the page passes it through NotificationRow; here we read it from the raw notif)
  const linkId = (notif as NotificationRow & { linkId?: number }).linkId ?? 0;

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">@{d.requesterUsername}</span> wants to link their player{" "}
            <span className="font-medium text-zinc-100">&ldquo;{d.playerName}&rdquo;</span> to your account
          </p>
          <p className="text-xs text-zinc-600">{timeAgo(notif.createdAt)}</p>
        </div>
        {!linkPending && <StatusPill status={notif.link?.status ?? "PENDING"} />}
      </div>

      {linkPending && !isAccepting && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" loading={isLoading} onClick={() => onReject(linkId)}>Reject</Button>
          <Button size="sm" onClick={onStartAccept}>Accept</Button>
        </div>
      )}

      {linkPending && isAccepting && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <p className="text-sm text-zinc-400">
            Which of your players represents <span className="font-medium text-zinc-200">@{d.requesterUsername}</span>?
          </p>
          <PlayerCombobox
            players={myPlayers}
            value={selectedPlayer}
            onChange={onPlayerChange}
            onConfirm={() => onConfirmAccept(linkId)}
          />
          {pickError && <p className="text-sm text-red-400">{pickError}</p>}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancelAccept}>Cancel</Button>
            <Button size="sm" loading={isLoading} onClick={() => onConfirmAccept(linkId)}>Confirm</Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ── InviteSessionDetail type ──────────────────────────────────────────────────

interface InviteSessionDetailPlayer {
  name: string;
  buyIn: number | null;
  cashOut: number | null;
  profit: number | null;
  isYou: boolean;
}

interface InviteSessionDetail {
  date: string;
  location: string | null;
  notes: string | null;
  inviterUsername: string;
  inviterBuyIn: number;
  inviterCashOut: number;
  inviterProfit: number;
  players: InviteSessionDetailPlayer[];
}

// ── SessionInviteReceivedCard ─────────────────────────────────────────────────

function SessionInviteReceivedCard({
  notif,
  d,
  sessionId,
  invitePending,
  invitePhase,
  isLoading,
  myPlayers,
  error,
  createdAt,
  duplicateCheck,
  onStartAccept,
  onReject,
  onMappingChange,
  onCancelMapping,
  onSubmitMapping,
}: {
  notif: NotificationRow;
  d: SessionInviteReceivedData;
  sessionId: number | null;
  invitePending: boolean;
  invitePhase: InviteAcceptPhase;
  isLoading: boolean;
  myPlayers: { id: number; name: string }[];
  error: string | undefined;
  createdAt: string;
  duplicateCheck: DuplicateCheckState | undefined;
  onStartAccept: (isOverwrite: boolean, existingSessionId?: number) => void;
  onReject: () => void;
  onMappingChange: (fromPlayerId: number, player: ComboboxPlayer | null) => void;
  onCancelMapping: () => void;
  onSubmitMapping: () => void;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<InviteSessionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);

  async function openView() {
    setViewOpen(true);
    if (viewData || !notif.inviteId) return;
    setViewLoading(true);
    try {
      const res = await fetch(`/api/invites/${notif.inviteId}`);
      if (res.ok) setViewData(await res.json());
    } finally {
      setViewLoading(false);
    }
  }

  const dupResult = duplicateCheck?.status === "done" ? duplicateCheck.result : null;

  function handleOverwriteClick() {
    if (!dupResult) return;
    const financialsDiffer =
      d.buyIn !== dupResult.myBuyIn ||
      d.cashOut !== dupResult.myCashOut;
    if (financialsDiffer) {
      setOverwriteConfirmOpen(true);
    } else {
      onStartAccept(true, dupResult.sessionId);
    }
  }

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm text-zinc-300">
            <span className="font-medium text-zinc-100">@{d.inviterUsername}</span> shared a session with you from{" "}
            <SessionLink sessionId={sessionId} date={d.sessionDate} />
            {d.sessionLocation && <span className="text-zinc-500"> @ {d.sessionLocation}</span>}
          </p>
          <p className="text-xs text-zinc-600">{timeAgo(createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!invitePending && <StatusPill status={notif.invite?.status ?? "PENDING"} />}
          <button
            onClick={openView}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            View
          </button>
        </div>
      </div>

      {invitePending && invitePhase.phase === "idle" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              {d.buyIn != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Buy-in</span>{formatCurrency(d.buyIn)}</span>}
              {d.cashOut != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Cash-out</span>{formatCurrency(d.cashOut)}</span>}
              {d.profit != null && <Badge value={d.profit} />}
            </div>
            <div className="flex gap-2">
              {(!duplicateCheck || duplicateCheck.status === "checking") ? (
                <>
                  <Button size="sm" variant="ghost" loading={isLoading} onClick={onReject}>Reject</Button>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-400" />
                    Checking…
                  </span>
                </>
              ) : dupResult === null ? (
                <>
                  <Button size="sm" variant="ghost" loading={isLoading} onClick={onReject}>Reject</Button>
                  <Button size="sm" loading={isLoading} onClick={() => onStartAccept(false)}>Accept</Button>
                </>
              ) : null}
            </div>
          </div>

          {dupResult !== null && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Found matching session:{" "}
                <Link href={`/sessions/${dupResult.sessionId}`} className="text-zinc-200 underline underline-offset-2 hover:text-white">
                  {formatDate(d.sessionDate)}
                </Link>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" loading={isLoading} onClick={onReject}>Reject</Button>
                <Button size="sm" variant="ghost" loading={isLoading} onClick={() => onStartAccept(false)}>
                  Save as new
                </Button>
                <Button size="sm" loading={isLoading} onClick={handleOverwriteClick}>
                  Update existing
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {invitePending && invitePhase.phase === "resolving" && (
        <p className="text-sm text-zinc-500 text-right">Checking players…</p>
      )}

      {invitePending && invitePhase.phase === "mapping" && (
        <InviteMappingUI
          invitePhase={invitePhase}
          myPlayers={myPlayers}
          error={error}
          submitting={false}
          onMappingChange={(fromPlayerId, player) => onMappingChange(fromPlayerId, player)}
          onCancel={onCancelMapping}
          onSubmit={onSubmitMapping}
        />
      )}

      {invitePending && invitePhase.phase === "submitting" && (
        <p className="text-sm text-zinc-500 text-right">Accepting…</p>
      )}

      {!invitePending && d.profit != null && <Badge value={d.profit} />}

      <Modal
        open={overwriteConfirmOpen}
        onClose={() => setOverwriteConfirmOpen(false)}
        title="Update existing session?"
      >
        {dupResult && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Your recorded figures differ from{" "}
              <span className="font-medium text-zinc-200">@{d.inviterUsername}</span>&apos;s.
              Updating will apply their figures to your existing session.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-zinc-600">
                  <th className="pb-1.5 text-left font-medium"></th>
                  <th className="pb-1.5 text-right font-medium">Your record</th>
                  <th className="pb-1.5 text-right font-medium">Their record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="py-1.5 text-zinc-500">Buy-in</td>
                  <td className={clsx("py-1.5 text-right", dupResult.myBuyIn !== d.buyIn && "text-amber-300")}>{formatCurrency(dupResult.myBuyIn)}</td>
                  <td className={clsx("py-1.5 text-right", dupResult.myBuyIn !== d.buyIn ? "text-amber-300 font-medium" : "text-zinc-300")}>{d.buyIn != null ? formatCurrency(d.buyIn) : "—"}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-500">Cash-out</td>
                  <td className={clsx("py-1.5 text-right", dupResult.myCashOut !== d.cashOut && "text-amber-300")}>{formatCurrency(dupResult.myCashOut)}</td>
                  <td className={clsx("py-1.5 text-right", dupResult.myCashOut !== d.cashOut ? "text-amber-300 font-medium" : "text-zinc-300")}>{d.cashOut != null ? formatCurrency(d.cashOut) : "—"}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-500">Profit</td>
                  <td className="py-1.5 text-right"><Badge value={dupResult.myProfit} /></td>
                  <td className="py-1.5 text-right">{d.profit != null ? <Badge value={d.profit} /> : "—"}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOverwriteConfirmOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => { setOverwriteConfirmOpen(false); onStartAccept(true, dupResult.sessionId); }}>
                Yes, update
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Session Details"
      >
        {viewLoading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!viewLoading && viewData && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-100">{formatDate(viewData.date)}</p>
              {viewData.location && <p className="text-xs text-zinc-400">@ {viewData.location}</p>}
              {viewData.notes && <p className="mt-1 text-xs text-zinc-500">{viewData.notes}</p>}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">Your result</p>
              <div className="flex items-center gap-4 text-sm">
                {d.buyIn != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Buy-in</span>{formatCurrency(d.buyIn)}</span>}
                {d.cashOut != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Cash-out</span>{formatCurrency(d.cashOut)}</span>}
                {d.profit != null && <Badge value={d.profit} />}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">All players</p>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">
                    @{viewData.inviterUsername}
                    <span className="ml-1.5 text-xs text-zinc-600">(host)</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {viewData.inviterBuyIn != null && <span className="text-xs text-zinc-500">{formatCurrency(viewData.inviterBuyIn)}</span>}
                    <Badge value={viewData.inviterProfit} />
                  </div>
                </li>
                {viewData.players.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className={clsx("text-zinc-300", p.isYou && "font-medium text-zinc-100")}>
                      {p.name}
                      {p.isYou && <span className="ml-1.5 text-xs text-zinc-600">(you)</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      {p.buyIn != null && <span className="text-xs text-zinc-500">{formatCurrency(p.buyIn)}</span>}
                      {p.profit != null && <Badge value={p.profit} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </li>
  );
}

// ── InviteMappingUI ───────────────────────────────────────────────────────────

function InviteMappingUI({
  invitePhase,
  myPlayers,
  error,
  submitting,
  onMappingChange,
  onCancel,
  onSubmit,
}: {
  invitePhase: InviteAcceptPhase & { phase: "mapping" };
  myPlayers: { id: number; name: string }[];
  error: string | undefined;
  submitting: boolean;
  onMappingChange: (fromPlayerId: number, player: ComboboxPlayer | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 border-t border-zinc-800 pt-3">
      {invitePhase.resolved.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-zinc-500">Automatically included</p>
          <ul className="space-y-1">
            {invitePhase.resolved.map((r) => (
              <li key={r.fromPlayerId} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="text-emerald-500">✓</span>
                <span className="font-medium text-zinc-300">&ldquo;{r.fromPlayerName}&rdquo;</span>
                <span className="text-zinc-600">→</span>
                <span className="font-medium text-zinc-300">&ldquo;{r.toPlayerName}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm text-zinc-400">Map the remaining players, or skip them:</p>
        {invitePhase.unresolved.map((u) => (
          <div key={u.fromPlayerId} className="space-y-1">
            <label className="text-xs text-zinc-500">
              <span className="font-medium text-zinc-300">&ldquo;{u.fromPlayerName}&rdquo;</span>
            </label>
            <PlayerCombobox
              players={myPlayers}
              value={invitePhase.mappings[u.fromPlayerId] ?? null}
              onChange={(p) => onMappingChange(u.fromPlayerId, p)}
              placeholder="Skip, or search / create a player…"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button size="sm" loading={submitting} onClick={onSubmit}>Confirm</Button>
      </div>
    </div>
  );
}
