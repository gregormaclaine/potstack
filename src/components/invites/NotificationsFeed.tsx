"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import PlayerCombobox, { type ComboboxPlayer } from "@/components/ui/PlayerCombobox";
import { formatDate } from "@/lib/formatters";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type {
  NotificationRow,
  NotificationData,
  LinkRequestReceivedData,
  SessionInviteReceivedData,
} from "@/types";

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

function SessionLink({ sessionId, date, acceptedSessionId }: { sessionId: number | null; date: string; acceptedSessionId?: number }) {
  const label = formatDate(date);
  if (acceptedSessionId != null) {
    return (
      <Link href={`/accepted-sessions/${acceptedSessionId}`} className="text-zinc-200 underline underline-offset-2 hover:text-white">
        {label}
      </Link>
    );
  }
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface MyPlayer { id: number; name: string }

interface NotificationsFeedProps {
  notifications: NotificationRow[];
  myPlayers: MyPlayer[];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationsFeed({ notifications, myPlayers }: NotificationsFeedProps) {
  const [notifList, setNotifList] = useState<NotificationRow[]>(notifications);

  function replaceNotif(id: number, replacement: NotificationRow) {
    setNotifList((prev) => prev.map((n) => (n.id === id ? replacement : n)));
  }

  if (notifList.length === 0) {
    return <div className="py-16 text-center text-zinc-500">No notifications yet.</div>;
  }

  return (
    <ul className="space-y-3">
      {notifList.map((notif) => {
        const { id, type, data, sessionId } = notif;

        if (type === "link_request_received") {
          const d = data as LinkRequestReceivedData & { type: "link_request_received" };
          const linkPending = notif.link?.status === "PENDING";
          return (
            <LinkRequestReceivedCard
              key={id}
              notif={notif}
              d={d}
              linkPending={linkPending}
              linkId={notif.linkId ?? 0}
              myPlayers={myPlayers}
              onReplace={(n) => replaceNotif(id, n)}
            />
          );
        }

        if (type === "session_invite_received") {
          const d = data as SessionInviteReceivedData & { type: "session_invite_received" };
          const invitePending = notif.invite?.status === "PENDING";
          return (
            <SessionInviteReceivedCard
              key={id}
              notif={notif}
              d={d}
              sessionId={sessionId}
              invitePending={invitePending}
              onReplace={(n) => replaceNotif(id, n)}
            />
          );
        }

        return (
          <li key={id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm text-zinc-300">
                  <NotificationText data={data} sessionId={sessionId} />
                </p>
                <p className="text-xs text-zinc-600">{timeAgo(notif.createdAt)}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── NotificationText ──────────────────────────────────────────────────────────

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
      return <>You accepted <span className="font-medium text-zinc-100">@{data.otherUsername}</span>&apos;s session from <SessionLink sessionId={sessionId} date={data.sessionDate} acceptedSessionId={data.acceptedSessionId} /></>;

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
  linkId,
  myPlayers,
  onReplace,
}: {
  notif: NotificationRow;
  d: LinkRequestReceivedData;
  linkPending: boolean;
  linkId: number;
  myPlayers: { id: number; name: string }[];
  onReplace: (n: NotificationRow) => void;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<ComboboxPlayer | null>(null);
  const [pickError, setPickError] = useState("");
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);

  async function confirmAccept() {
    setPickError("");
    if (!selectedPlayer) { setPickError("Please select or create a player."); return; }

    setLoading("confirm");
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
      const resData: { error?: string } = await res.json();
      if (!res.ok) { setPickError(resData.error ?? "Failed to accept"); return; }

      onReplace({
        ...notif,
        type: "link_accepted",
        data: { type: "link_accepted", otherUsername: d.requesterUsername, myPlayerName: selectedPlayer.name },
        link: { status: "ACCEPTED" },
      });
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    setLoading("reject");
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) return;
      onReplace({
        ...notif,
        type: "link_rejected_received",
        data: { type: "link_rejected_received", otherUsername: d.requesterUsername, playerName: d.playerName },
        link: { status: "REJECTED" },
      });
    } finally {
      setLoading(null);
    }
  }

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
          <Button size="sm" variant="ghost" loading={loading === "reject"} onClick={reject}>Reject</Button>
          <Button size="sm" onClick={() => { setIsAccepting(true); setSelectedPlayer(null); setPickError(""); }}>Accept</Button>
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
            onChange={(p) => { setSelectedPlayer(p); setPickError(""); }}
            onConfirm={confirmAccept}
          />
          {pickError && <p className="text-sm text-red-400">{pickError}</p>}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setIsAccepting(false); setPickError(""); }}>Cancel</Button>
            <Button size="sm" loading={loading === "confirm"} onClick={confirmAccept}>Confirm</Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ── InviteSessionDetail types ─────────────────────────────────────────────────

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
  onReplace,
}: {
  notif: NotificationRow;
  d: SessionInviteReceivedData;
  sessionId: number | null;
  invitePending: boolean;
  onReplace: (n: NotificationRow) => void;
}) {
  const router = useRouter();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<InviteSessionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

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

  async function accept() {
    if (!notif.inviteId) return;
    setLoading("accept");
    try {
      const res = await fetch(`/api/invites/${notif.inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) return;
      const data: { acceptedSessionId: number } = await res.json();
      router.push(`/accepted-sessions/${data.acceptedSessionId}`);
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    if (!notif.inviteId) return;
    setLoading("reject");
    try {
      const res = await fetch(`/api/invites/${notif.inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) return;
      onReplace({
        ...notif,
        type: "session_invite_rejected_by_me",
        data: { type: "session_invite_rejected_by_me", otherUsername: d.inviterUsername, sessionDate: d.sessionDate, sessionLocation: d.sessionLocation },
        invite: { status: "REJECTED" },
      });
    } finally {
      setLoading(null);
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
          <p className="text-xs text-zinc-600">{timeAgo(notif.createdAt)}</p>
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

      {invitePending && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            {d.buyIn != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Buy-in</span>{formatCurrency(d.buyIn)}</span>}
            {d.cashOut != null && <span className="text-zinc-400"><span className="mr-1 text-xs text-zinc-600">Cash-out</span>{formatCurrency(d.cashOut)}</span>}
            {d.profit != null && <Badge value={d.profit} />}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" loading={loading === "reject"} onClick={reject}>Reject</Button>
            <Button size="sm" loading={loading === "accept"} onClick={accept}>Accept</Button>
          </div>
        </div>
      )}

      {!invitePending && d.profit != null && <Badge value={d.profit} />}

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Session Details">
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
