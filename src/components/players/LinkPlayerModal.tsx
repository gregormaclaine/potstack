"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { PlayerLinkSummary } from "@/types";

interface LinkPlayerModalProps {
  player: { id: number; name: string };
  existingLink?: PlayerLinkSummary;
  onClose: () => void;
  onLinked: (link: PlayerLinkSummary) => void;
  onUnlinked: (playerId: number) => void;
}

export default function LinkPlayerModal({
  player,
  existingLink,
  onClose,
  onLinked,
  onUnlinked,
}: LinkPlayerModalProps) {
  const [username, setUsername] = useState(existingLink?.linkedUsername ?? "");
  const [searchResult, setSearchResult] = useState<{ id: number; username: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [equivalenceCount, setEquivalenceCount] = useState<number | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasLink = !!existingLink;
  const isPending = existingLink?.status === "PENDING";
  const isAccepted = existingLink?.status === "ACCEPTED";
  const isRejected = existingLink?.status === "REJECTED";

  // Fetch equivalence count for accepted links so we can warn before unlinking
  useEffect(() => {
    if (!isAccepted || !existingLink) return;
    fetch(`/api/links/${existingLink.id}`)
      .then((r) => r.json())
      .then((d) => setEquivalenceCount(d.equivalenceCount ?? 0))
      .catch(() => setEquivalenceCount(0));
  }, [isAccepted, existingLink]);

  useEffect(() => {
    if (hasLink) return;
    if (!username.trim()) {
      setSearchResult(null);
      setNotFound(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/users/search?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        const match = data.users?.find(
          (u: { id: number; username: string }) =>
            u.username.toLowerCase() === username.trim().toLowerCase()
        ) ?? null;
        setSearchResult(match ?? null);
        setNotFound(!match && username.trim().length > 0);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, hasLink]);

  async function sendRequest() {
    if (!searchResult) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, linkedUsername: searchResult.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send link request");
        return;
      }
      onLinked({
        id: data.link.id,
        status: "PENDING",
        linkedUsername: searchResult.username,
        playerId: player.id,
      });
      onClose();
    } finally {
      setSending(false);
    }
  }

  async function cancelLink() {
    if (!existingLink) return;
    setError("");
    setCancelling(true);
    try {
      const res = await fetch(`/api/links/${existingLink.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel link");
        return;
      }
      onUnlinked(player.id);
      onClose();
    } finally {
      setCancelling(false);
    }
  }

  const statusBadge = hasLink ? (
    <span
      className={
        isPending
          ? "rounded-full bg-yellow-600/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
          : isAccepted
          ? "rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
          : "rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-medium text-red-400"
      }
    >
      {isPending ? "Pending" : isAccepted ? "Linked" : "Rejected"}
    </span>
  ) : null;

  return (
    <Modal open title={`Link ${player.name} to an account`} onClose={onClose}>
      {hasLink ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
            <span className="text-sm text-zinc-300">@{existingLink!.linkedUsername}</span>
            {statusBadge}
          </div>
          {isRejected && (
            <p className="text-sm text-zinc-500">
              The link request was rejected. Cancel it to send a new request.
            </p>
          )}
          {isAccepted && (
            <p className="text-sm text-zinc-500">
              This player is linked to <span className="text-zinc-300">@{existingLink!.linkedUsername}</span>. Unlinking will stop future session invites from being sent.
            </p>
          )}
          {isAccepted && confirmingUnlink && equivalenceCount != null && equivalenceCount > 0 && (
            <p className="text-sm text-amber-400">
              This will also remove{" "}
              <span className="font-medium">{equivalenceCount} saved player mapping{equivalenceCount !== 1 ? "s" : ""}</span>{" "}
              for sessions shared with @{existingLink!.linkedUsername}. Past sessions will not be affected.
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {(isPending || isRejected) && (
              <Button variant="danger" loading={cancelling} onClick={cancelLink}>
                Cancel Request
              </Button>
            )}
            {isAccepted && !confirmingUnlink && (
              <Button
                variant="danger"
                onClick={() => {
                  if (equivalenceCount && equivalenceCount > 0) {
                    setConfirmingUnlink(true);
                  } else {
                    cancelLink();
                  }
                }}
              >
                Unlink
              </Button>
            )}
            {isAccepted && confirmingUnlink && (
              <>
                <Button variant="ghost" onClick={() => setConfirmingUnlink(false)}>Back</Button>
                <Button variant="danger" loading={cancelling} onClick={cancelLink}>
                  Confirm Unlink
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter the exact username of the account to link to <span className="font-medium text-zinc-200">{player.name}</span>.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchResult) sendRequest(); }}
              autoFocus
            />
            {searching && <p className="text-xs text-zinc-500">Searching…</p>}
            {searchResult && !searching && (
              <p className="text-xs text-emerald-400">Found: @{searchResult.username}</p>
            )}
            {notFound && !searching && (
              <p className="text-xs text-red-400">No user found with that username.</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!searchResult}
              loading={sending}
              onClick={sendRequest}
            >
              Send Link Request
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
