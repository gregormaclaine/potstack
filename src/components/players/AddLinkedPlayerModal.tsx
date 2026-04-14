"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { PlayerWithStats, PlayerLinkSummary } from "@/types";

interface Props {
  onClose: () => void;
  onAdded: (player: PlayerWithStats, link: PlayerLinkSummary) => void;
}

interface UserResult {
  id: number;
  username: string;
}

export default function AddLinkedPlayerModal({ onClose, onAdded }: Props) {
  const [usernameQuery, setUsernameQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedUser) return;
    if (!usernameQuery.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?username=${encodeURIComponent(usernameQuery.trim())}`
        );
        const data = await res.json() as { users: UserResult[] };
        setSuggestions(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [usernameQuery, selectedUser]);

  function selectUser(user: UserResult) {
    setSelectedUser(user);
    setSuggestions([]);
    setUsernameQuery(user.username);
    setTimeout(() => playerNameRef.current?.focus(), 50);
  }

  function clearUser() {
    setSelectedUser(null);
    setUsernameQuery("");
    setSuggestions([]);
    setPlayerName("");
    setError("");
  }

  async function handleSubmit() {
    if (!selectedUser || !playerName.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      // 1. Create the player
      const playerRes = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName.trim() }),
      });
      const playerData = await playerRes.json() as { player?: { id: number; name: string; createdAt: string; groupId: number | null }; error?: string };
      if (!playerRes.ok) {
        setError(playerData.error ?? "Failed to create player");
        return;
      }
      const newPlayer = playerData.player!;

      // 2. Send link request
      const linkRes = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: newPlayer.id, linkedUsername: selectedUser.username }),
      });
      const linkData = await linkRes.json() as { link?: { id: number }; error?: string };
      if (!linkRes.ok) {
        setError(linkData.error ?? "Player created but link request failed");
        return;
      }

      const playerWithStats: PlayerWithStats = {
        id: newPlayer.id,
        name: newPlayer.name,
        createdAt: newPlayer.createdAt,
        groupId: newPlayer.groupId,
        group: null,
        sessionCount: 0,
        totalProfit: 0,
        avgSessionProfit: 0,
      };
      const link: PlayerLinkSummary = {
        id: linkData.link!.id,
        status: "PENDING",
        linkedUsername: selectedUser.username,
        playerId: newPlayer.id,
      };
      onAdded(playerWithStats, link);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!selectedUser && playerName.trim().length > 0;

  return (
    <Modal open title="Add Linked Player" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Search for a user by username, then choose the name this player will
          appear as in your records. A link request will be sent to them
          automatically.
        </p>

        {/* Username search */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Username
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by username…"
                value={usernameQuery}
                onChange={(e) => {
                  setUsernameQuery(e.target.value);
                  if (selectedUser) clearUser();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") clearUser();
                  if (e.key === "ArrowDown" && suggestions.length > 0) {
                    e.preventDefault();
                  }
                }}
                autoFocus
                className="flex-1"
              />
              {selectedUser && (
                <button
                  onClick={clearUser}
                  className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Clear selection"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {!selectedUser && usernameQuery.trim() && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                {searching && (
                  <p className="px-3 py-2 text-xs text-zinc-500">Searching…</p>
                )}
                {!searching && suggestions.length === 0 && (
                  <p className="px-3 py-2 text-xs text-zinc-500">No users found.</p>
                )}
                {!searching && suggestions.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
                  >
                    <span className="text-zinc-500">@</span>
                    {u.username}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <p className="text-xs text-emerald-400">
              Selected: @{selectedUser.username}
            </p>
          )}
        </div>

        {/* Player name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Player name in your records
          </label>
          <Input
            ref={playerNameRef}
            placeholder="e.g. John"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
            disabled={!selectedUser}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSubmit}
            loading={submitting}
            onClick={handleSubmit}
          >
            Add &amp; Send Link Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
