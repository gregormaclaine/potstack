"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import CurrencyValue from "@/components/ui/CurrencyValue";
import PlayerCombobox, { type ComboboxPlayer } from "@/components/ui/PlayerCombobox";
import type { AcceptedSessionPlayer } from "@/types";

interface Creator {
  username: string;
  playerName: string | null;
  buyIn: number;
  cashOut: number;
  profit: number;
}

interface Props {
  acceptedSessionId: number;
  initialPlayers: AcceptedSessionPlayer[];
  myPlayers: ComboboxPlayer[];
  creator: Creator;
}

export default function AcceptedSessionPlayerList({ acceptedSessionId, initialPlayers, myPlayers, creator }: Props) {
  const [players, setPlayers] = useState(initialPlayers);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ComboboxPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const playersWithResults = players.filter((p) => p.buyIn !== null);
  const playersPresenceOnly = players.filter((p) => p.buyIn === null);

  async function confirmLink(fromPlayerId: number) {
    if (!selectedPlayer) { setError("Please select or create a player."); return; }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/accepted-sessions/${acceptedSessionId}/link-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        selectedPlayer.id === -1
          ? { fromPlayerId, newPlayerName: selectedPlayer.name }
          : { fromPlayerId, toPlayerId: selectedPlayer.id }
      ),
    });

    const data: unknown = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Failed to link player.");
      return;
    }

    const { toPlayerId, toPlayerName } = data as { toPlayerId: number; toPlayerName: string };
    setPlayers((prev) =>
      prev.map((p) =>
        p.fromPlayerId === fromPlayerId
          ? { ...p, toPlayerId, toPlayerName, resolvedVia: "equivalence" as const, linkedUsername: null }
          : p
      )
    );
    setLinkingId(null);
    setSelectedPlayer(null);
  }

  function linkIcon(tooltip: string) {
    return (
      <span className="group/link relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-emerald-400">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 opacity-0 transition-opacity group-hover/link:opacity-100">
          {tooltip}
        </span>
      </span>
    );
  }

  function renderPlayerName(p: AcceptedSessionPlayer) {
    if (p.toPlayerName) {
      const tooltip = p.resolvedVia === "playerLink" && p.linkedUsername
        ? `@${p.linkedUsername}`
        : `Mapped from "${p.fromPlayerName}"`;
      return (
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-100">{p.toPlayerName}</span>
          {linkIcon(tooltip)}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2">
        <span className="font-medium text-zinc-100">{p.fromPlayerName}</span>
        {linkingId === p.fromPlayerId ? (
          <span className="flex items-center gap-1">
            <span className="w-44">
              <PlayerCombobox
                players={myPlayers}
                value={selectedPlayer}
                onChange={setSelectedPlayer}
                onConfirm={() => confirmLink(p.fromPlayerId)}
                placeholder="Link to your player…"
              />
            </span>
            <button
              onClick={() => confirmLink(p.fromPlayerId)}
              disabled={saving}
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={() => { setLinkingId(null); setSelectedPlayer(null); setError(null); }}
              className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => { setLinkingId(p.fromPlayerId); setSelectedPlayer(null); setError(null); }}
            className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-emerald-600 hover:text-emerald-400 transition-colors"
          >
            Link
          </button>
        )}
      </span>
    );
  }

  return (
    <>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {(playersWithResults.length > 0 || creator.buyIn != null) && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">Player Results</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Player</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Buy-in</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Cash-out</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr className="bg-zinc-950">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-zinc-100">{creator.playerName ?? `@${creator.username}`}</span>
                      {linkIcon(`@${creator.username}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={creator.buyIn} /></td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={creator.cashOut} /></td>
                  <td className="px-4 py-3 text-right"><Badge value={creator.profit} /></td>
                </tr>
                {playersWithResults.map((p) => (
                  <tr key={p.fromPlayerId} className="bg-zinc-950">
                    <td className="px-4 py-3">{renderPlayerName(p)}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={p.buyIn!} /></td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={p.cashOut!} /></td>
                    <td className="px-4 py-3 text-right"><Badge value={p.profit!} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {playersPresenceOnly.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">Also Played</h2>
          <div className="flex flex-wrap gap-2">
            {playersPresenceOnly.map((p) => (
              <div
                key={p.fromPlayerId}
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 py-1 pl-3 pr-2 text-sm text-zinc-300"
              >
                {renderPlayerName(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {players.length === 0 && (
        <p className="mb-6 text-sm text-zinc-600">No players recorded for this session.</p>
      )}
    </>
  );
}
