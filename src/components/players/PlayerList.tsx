"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";
import type { PlayerWithStats } from "@/types";

interface PlayerListProps {
  initialPlayers: PlayerWithStats[];
}

export default function PlayerList({ initialPlayers }: PlayerListProps) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(player: PlayerWithStats) {
    setEditingId(player.id);
    setEditName(player.name);
    setEditError("");
  }

  async function saveEdit(id: number) {
    setEditError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to rename player");
        return;
      }
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, name: data.player.name } : p
        )
      );
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete(id: number) {
    setDeleteError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete player");
        return;
      }
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const deleteTarget = players.find((p) => p.id === deletingId);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="py-8 text-center text-zinc-500">
          {search ? "No players match your search." : "No players yet."}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead className="border-b border-zinc-800 bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Sessions
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Total Profit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Avg Profit With
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Added
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((player) => (
              <tr key={player.id} className="bg-zinc-950 hover:bg-zinc-900/50">
                <td className="px-4 py-3">
                  {editingId === player.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        error={editError}
                        className="w-40"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(player.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        loading={loading}
                        onClick={() => saveEdit(player.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium text-zinc-100">
                      {player.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-400">
                  {player.sessionCount}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge value={player.totalProfit} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge value={player.avgSessionProfit} />
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-500">
                  {formatDate(player.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div
                    className={clsx(
                      "flex items-center justify-end gap-2",
                      editingId === player.id && "invisible"
                    )}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(player)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setDeletingId(player.id);
                        setDeleteError("");
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete Player"
      >
        <p className="mb-4 text-sm text-zinc-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-zinc-100">
            {deleteTarget?.name}
          </span>
          ?{" "}
          {deleteTarget && deleteTarget.sessionCount > 0 && (
            <span className="text-red-400">
              This player has {deleteTarget.sessionCount} session
              {deleteTarget.sessionCount !== 1 ? "s" : ""} and cannot be
              deleted.
            </span>
          )}
        </p>
        {deleteError && (
          <p className="mb-4 text-sm text-red-400">{deleteError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={
              !!deleteTarget && deleteTarget.sessionCount > 0
            }
            onClick={() => deletingId && confirmDelete(deletingId)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
