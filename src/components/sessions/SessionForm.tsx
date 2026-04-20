"use client";

import { useState, useEffect, useRef, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PlayerRowInput from "./PlayerRowInput";
import PlayerSearchCombobox from "@/components/players/PlayerSearchCombobox";
import LinkPlayerModal from "@/components/players/LinkPlayerModal";
import { formatCurrency } from "@/lib/formatters";
import { clsx } from "clsx";
import type { LinkStatus, PlayerLinkSummary } from "@/types";

interface PlayerRow {
  playerId: number;
  playerName: string;
  buyIn: number | null;
  cashOut: number | null;
  /** Link from this player to another user account. */
  linkId?: number;
  linkStatus?: LinkStatus | null;
  linkedUsername?: string;
  linkedUserAvatar?: string | null;
  /**
   * True when the link was created during this form session.
   * These players should not be cleaned up as orphans even if removed.
   */
  newlyLinked?: boolean;
}

interface SessionFormProps {
  mode: "create" | "edit";
  sessionId?: number;
  returnUrl?: string;
  defaultValues?: {
    date: string;
    location?: string;
    notes?: string;
    buyIn: number;
    cashOut: number;
    players: PlayerRow[];
  };
}

export default function SessionForm({
  mode,
  sessionId,
  returnUrl = "/sessions",
  defaultValues,
}: SessionFormProps) {
  const router = useRouter();

  const [date, setDate] = useState(
    defaultValues?.date
      ? defaultValues.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [myBuyIn, setMyBuyIn] = useState(defaultValues?.buyIn ?? 0);
  const [myCashOut, setMyCashOut] = useState(defaultValues?.cashOut ?? 0);
  const [rawBuyIn, setRawBuyIn] = useState(String(defaultValues?.buyIn ?? 0));
  const [rawCashOut, setRawCashOut] = useState(String(defaultValues?.cashOut ?? 0));
  const [players, setPlayers] = useState<PlayerRow[]>(
    defaultValues?.players ?? []
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Index of the player row currently open in the link modal, or null if closed.
  const [linkingIndex, setLinkingIndex] = useState<number | null>(null);

  // Whether to send session invites to linked players (auto-checked).
  const [sendInvites, setSendInvites] = useState(true);

  // Map of playerId → PlayerLinkSummary for all sent links (preloaded on mount).
  const [sentLinks, setSentLinks] = useState<Map<number, PlayerLinkSummary>>(new Map());

  // Players that may have become orphaned (0 sessions) and should be deleted:
  // - players removed from the form during editing
  // - newly created players (orphaned if session is cancelled without saving)
  // The DELETE API rejects deletion if a player still has sessions, so it is safe
  // to call for any candidate regardless of whether they were recently created.
  const playersToCheckRef = useRef(new Set<number>());

  // Fetch all links (sent + accepted-received) so we know which players are already linked.
  useEffect(() => {
    Promise.all([
      fetch("/api/links?type=sent").then((r) => r.json() as Promise<{ links: PlayerLinkSummary[] }>),
      fetch("/api/links?type=accepted-received").then((r) => r.json() as Promise<{ links: PlayerLinkSummary[] }>),
    ])
      .then(([sent, received]) => {
        const map = new Map<number, PlayerLinkSummary>();
        for (const link of sent.links) map.set(link.playerId, link);
        for (const link of received.links) {
          if (!map.has(link.playerId)) map.set(link.playerId, link);
        }
        setSentLinks(map);
        // Hydrate any default player rows with link info
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.linkId != null) return p; // already populated
            const link = map.get(p.playerId);
            if (!link) return p;
            return {
              ...p,
              linkId: link.id,
              linkStatus: link.status,
              linkedUsername: link.linkedUsername,
              linkedUserAvatar: link.linkedUserAvatar ?? null,
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => cleanupOrphans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanupOrphans() {
    playersToCheckRef.current.forEach((id) => {
      fetch(`/api/players/${id}`, { method: "DELETE" }).catch(() => {});
    });
    playersToCheckRef.current.clear();
  }

  const myProfit = myCashOut - myBuyIn;

  function addPlayer(player: { id: number; name: string }) {
    if (players.some((p) => p.playerId === player.id)) return;
    const link = sentLinks.get(player.id);
    setPlayers((prev) => [
      ...prev,
      {
        playerId: player.id,
        playerName: player.name,
        buyIn: null,
        cashOut: null,
        linkId: link?.id,
        linkStatus: link?.status ?? null,
        linkedUsername: link?.linkedUsername,
        linkedUserAvatar: link?.linkedUserAvatar ?? null,
      },
    ]);
  }

  function changePlayerBuyIn(index: number, value: number | null) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, buyIn: value } : p))
    );
  }

  function changePlayerCashOut(index: number, value: number | null) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, cashOut: value } : p))
    );
  }

  function removePlayer(index: number) {
    const player = players[index];
    // Don't try to delete players that had a link created during this session —
    // the link request is now attached to them so they should remain.
    if (!player.newlyLinked) {
      playersToCheckRef.current.add(player.playerId);
    }
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLinkCreated(link: PlayerLinkSummary) {
    // Update sentLinks map
    setSentLinks((prev) => {
      const next = new Map(prev);
      next.set(link.playerId, link);
      return next;
    });
    // Update the player row
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.playerId !== link.playerId) return p;
        // Remove from orphan cleanup — this player now has an active link request
        playersToCheckRef.current.delete(p.playerId);
        return {
          ...p,
          linkId: link.id,
          linkStatus: link.status,
          linkedUsername: link.linkedUsername,
          linkedUserAvatar: link.linkedUserAvatar ?? null,
          newlyLinked: true,
        };
      })
    );
  }

  function handleLinkRemoved(playerId: number) {
    setSentLinks((prev) => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.playerId !== playerId) return p;
        return { ...p, linkId: undefined, linkStatus: null, linkedUsername: undefined, linkedUserAvatar: null, newlyLinked: false };
      })
    );
  }

  // Count of players that will receive a session invite.
  const inviteCount = players.filter(
    (p) => p.linkStatus === "ACCEPTED" || p.newlyLinked
  ).length;

  // IDs of players whose PENDING link was newly created during this form.
  const pendingLinkPlayerIds = players
    .filter((p) => p.newlyLinked && p.linkStatus === "PENDING")
    .map((p) => p.playerId);

  const linkingPlayer =
    linkingIndex !== null ? players[linkingIndex] ?? null : null;

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = {
        date,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        buyIn: myBuyIn,
        cashOut: myCashOut,
        players: players.length
          ? players.map((p) => ({
              playerId: p.playerId,
              buyIn: p.buyIn,
              cashOut: p.cashOut,
            }))
          : undefined,
        skipInvites: !sendInvites,
        pendingLinkPlayerIds: pendingLinkPlayerIds.length ? pendingLinkPlayerIds : undefined,
      };

      const res = await fetch(
        mode === "edit" ? `/api/sessions/${sessionId}` : "/api/sessions",
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      // Clean up after a successful save: any removed player (or newly created
      // player that ended up not in this session) with 0 sessions gets deleted.
      cleanupOrphans();
      router.push(returnUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        className="space-y-6"
      >
        {/* Date & Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Location (optional)"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mike's place"
          />
        </div>

        <Input
          label="Notes (optional)"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this session..."
        />

        {/* My Results */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Your Results</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Buy-in
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  £
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={rawBuyIn}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) setRawBuyIn(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    const num = parseFloat(rawBuyIn);
                    const final = isNaN(num) ? 0 : num;
                    setRawBuyIn(String(final));
                    setMyBuyIn(final);
                  }}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-7 pr-3 text-right text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Cash-out
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  £
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={rawCashOut}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) setRawCashOut(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    const num = parseFloat(rawCashOut);
                    const final = isNaN(num) ? 0 : num;
                    setRawCashOut(String(final));
                    setMyCashOut(final);
                  }}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-7 pr-3 text-right text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm text-zinc-500">Net profit</span>
            <span
              className={clsx(
                "text-lg font-bold tabular-nums",
                myProfit > 0 && "text-emerald-400",
                myProfit < 0 && "text-red-400",
                myProfit === 0 && "text-zinc-400"
              )}
            >
              {myProfit > 0 ? "+" : ""}
              {formatCurrency(myProfit)}
            </span>
          </div>
        </div>

        {/* Players (optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              Who did you play with?
            </h2>
            <span className="text-xs text-zinc-500">optional</span>
          </div>

          {players.length > 0 && (
            <div className="space-y-2">
              {players.map((player, i) => (
                <PlayerRowInput
                  key={player.playerId}
                  index={i}
                  playerName={player.playerName}
                  buyIn={player.buyIn}
                  cashOut={player.cashOut}
                  linkStatus={player.linkStatus}
                  linkedUsername={player.linkedUsername}
                  linkedUserAvatar={player.linkedUserAvatar}
                  onChangeBuyIn={changePlayerBuyIn}
                  onChangeCashOut={changePlayerCashOut}
                  onRemove={removePlayer}
                  onLink={setLinkingIndex}
                />
              ))}
              {(() => {
                const trackedPlayers = players.filter((p) => p.buyIn !== null);
                if (trackedPlayers.length === 0) return null;
                const playersTotal = trackedPlayers.reduce(
                  (sum, p) => sum + (p.cashOut ?? 0) - (p.buyIn ?? 0),
                  0
                );
                const sessionTotal = myProfit + playersTotal;
                const isBalanced = Math.abs(sessionTotal) < 0.005;
                return (
                  <div className="flex items-center justify-between border-t border-zinc-800 px-1 pt-2">
                    <span className="text-xs text-zinc-500">
                      Session total{" "}
                      <span className="text-zinc-600">(should be £0)</span>
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-semibold tabular-nums",
                        isBalanced && "text-zinc-400",
                        !isBalanced && sessionTotal > 0 && "text-amber-400",
                        !isBalanced && sessionTotal < 0 && "text-red-400"
                      )}
                    >
                      {isBalanced ? "✓ " : sessionTotal > 0 ? "+" : ""}
                      {formatCurrency(isBalanced ? 0 : sessionTotal)}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <PlayerSearchCombobox
            onSelect={addPlayer}
            onPlayerCreated={(id) => playersToCheckRef.current.add(id)}
            excludeIds={players.map((p) => p.playerId)}
            placeholder="Search players or add new..."
          />
        </div>

        {/* Send invites checkbox */}
        {inviteCount > 0 && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
              className="h-4 w-4 accent-emerald-500 cursor-pointer"
            />
            <span className="text-sm text-zinc-300">
              Share this session with{" "}
              <span className="font-medium text-zinc-100">
                {inviteCount} linked player{inviteCount !== 1 ? "s" : ""}
              </span>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(returnUrl)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "edit" ? "Save Changes" : "Record Session"}
          </Button>
        </div>
      </form>

      {/* Link player modal */}
      {linkingPlayer !== null && (
        <LinkPlayerModal
          player={{ id: linkingPlayer.playerId, name: linkingPlayer.playerName }}
          existingLink={
            linkingPlayer.linkId != null
              ? {
                  id: linkingPlayer.linkId,
                  status: linkingPlayer.linkStatus ?? "PENDING",
                  linkedUsername: linkingPlayer.linkedUsername ?? "",
                  playerId: linkingPlayer.playerId,
                }
              : undefined
          }
          onClose={() => setLinkingIndex(null)}
          onLinked={(link) => {
            handleLinkCreated(link);
            setLinkingIndex(null);
          }}
          onUnlinked={(playerId) => {
            handleLinkRemoved(playerId);
            setLinkingIndex(null);
          }}
        />
      )}
    </>
  );
}
