"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import UserAvatar from "@/components/ui/UserAvatar";
import type { ReceivedLinkRequest } from "@/types";

interface MyPlayer {
  id: number;
  name: string;
}

interface PendingLinkRequestsProps {
  initialRequests: ReceivedLinkRequest[];
  myPlayers: MyPlayer[];
}

const CREATE_NEW = "__create_new__";

export default function PendingLinkRequests({ initialRequests, myPlayers }: PendingLinkRequestsProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  // Which request is in the "pick a player" step
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [pickError, setPickError] = useState("");

  function startAccept(reqId: number) {
    setAcceptingId(reqId);
    setSelectedPlayerId("");
    setNewPlayerName("");
    setPickError("");
  }

  function cancelAccept() {
    setAcceptingId(null);
    setSelectedPlayerId("");
    setNewPlayerName("");
    setPickError("");
  }

  async function confirmAccept(id: number) {
    setPickError("");
    const isCreating = selectedPlayerId === CREATE_NEW;
    const name = newPlayerName.trim();

    if (!selectedPlayerId) {
      setPickError("Please select or create a player.");
      return;
    }
    if (isCreating && !name) {
      setPickError("Please enter a name for the new player.");
      return;
    }

    setLoadingId(id);
    try {
      const body: Record<string, unknown> = { action: "accept" };
      if (isCreating) {
        body.newPlayerName = name;
      } else {
        body.targetPlayerId = Number(selectedPlayerId);
      }

      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPickError(data.error ?? "Failed to accept link");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setAcceptingId(null);
    } finally {
      setLoadingId(null);
    }
  }

  async function reject(id: number) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) return;
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing here.</p>;
  }

  return (
    <ul className="space-y-3">
      {requests.map((req) => {
        const isPicking = acceptingId === req.id;
        return (
          <li
            key={req.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <UserAvatar avatarId={req.requesterAvatar} size="sm" />
                <p>
                  <span className="font-medium text-zinc-100">@{req.requesterUsername}</span> wants
                  to link their player{" "}
                  <span className="font-medium text-zinc-100">&ldquo;{req.playerName}&rdquo;</span>{" "}
                  to your account.
                </p>
              </div>
              {!isPicking && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={loadingId === req.id}
                    onClick={() => reject(req.id)}
                  >
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => startAccept(req.id)}>
                    Accept
                  </Button>
                </div>
              )}
            </div>

            {isPicking && (
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <p className="text-sm text-zinc-400">
                  Which of your players represents{" "}
                  <span className="font-medium text-zinc-200">@{req.requesterUsername}</span>? Their
                  stats will be tracked in sessions shared with you.
                </p>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => { setSelectedPlayerId(e.target.value); setPickError(""); }}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a player…</option>
                  {myPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value={CREATE_NEW}>+ Create new player</option>
                </select>
                {selectedPlayerId === CREATE_NEW && (
                  <Input
                    placeholder="New player name"
                    value={newPlayerName}
                    onChange={(e) => { setNewPlayerName(e.target.value); setPickError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmAccept(req.id); }}
                    autoFocus
                  />
                )}
                {pickError && <p className="text-sm text-red-400">{pickError}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelAccept}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={loadingId === req.id}
                    onClick={() => confirmAccept(req.id)}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
