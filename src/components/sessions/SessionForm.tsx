"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PlayerRowInput from "./PlayerRowInput";
import PlayerSearchCombobox from "@/components/players/PlayerSearchCombobox";
import { formatCurrency } from "@/lib/formatters";
import { clsx } from "clsx";

interface PlayerRow {
  playerId: number;
  playerName: string;
  buyIn: number;
  cashOut: number;
}

interface SessionFormProps {
  mode: "create" | "edit";
  sessionId?: number;
  defaultValues?: {
    date: string;
    location?: string;
    notes?: string;
    players: PlayerRow[];
  };
}

export default function SessionForm({
  mode,
  sessionId,
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
  const [players, setPlayers] = useState<PlayerRow[]>(
    defaultValues?.players ?? []
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalBuyIn = players.reduce((sum, p) => sum + p.buyIn, 0);
  const totalCashOut = players.reduce((sum, p) => sum + p.cashOut, 0);
  const totalProfit = totalCashOut - totalBuyIn;

  function addPlayer(player: { id: number; name: string }) {
    if (players.some((p) => p.playerId === player.id)) return;
    setPlayers((prev) => [
      ...prev,
      { playerId: player.id, playerName: player.name, buyIn: 0, cashOut: 0 },
    ]);
  }

  function changePlayerField(
    index: number,
    field: "buyIn" | "cashOut",
    value: number
  ) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (players.length === 0) {
      setError("Add at least one player.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        date,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        players: players.map((p) => ({
          playerId: p.playerId,
          buyIn: p.buyIn,
          cashOut: p.cashOut,
        })),
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

      router.push("/sessions");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-300">Players</h2>
        {players.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-700 py-6 text-center text-sm text-zinc-500">
            No players added yet. Search below to add players.
          </p>
        )}
        <div className="space-y-2">
          {players.map((player, i) => (
            <PlayerRowInput
              key={player.playerId}
              index={i}
              playerName={player.playerName}
              buyIn={player.buyIn}
              cashOut={player.cashOut}
              onChange={changePlayerField}
              onRemove={removePlayer}
            />
          ))}
        </div>

        <PlayerSearchCombobox
          onSelect={addPlayer}
          excludeIds={players.map((p) => p.playerId)}
          placeholder="Search for a player or add new..."
        />
      </div>

      {players.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Session Summary
          </h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-zinc-500">Total Buy-in</span>
              <p className="font-semibold text-zinc-100">
                {formatCurrency(totalBuyIn)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Total Cash-out</span>
              <p className="font-semibold text-zinc-100">
                {formatCurrency(totalCashOut)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Net</span>
              <p
                className={clsx(
                  "font-bold",
                  totalProfit > 0 && "text-emerald-400",
                  totalProfit < 0 && "text-red-400",
                  totalProfit === 0 && "text-zinc-400"
                )}
              >
                {totalProfit > 0 ? "+" : ""}
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/sessions")}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "edit" ? "Save Changes" : "Record Session"}
        </Button>
      </div>
    </form>
  );
}
