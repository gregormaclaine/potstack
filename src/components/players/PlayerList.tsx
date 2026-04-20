"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import LinkPlayerModal from "@/components/players/LinkPlayerModal";
import AddLinkedPlayerModal from "@/components/players/AddLinkedPlayerModal";
import { formatDate } from "@/lib/formatters";
import UserAvatar from "@/components/ui/UserAvatar";
import type { PlayerWithStats, PlayerGroup, PlayerLinkSummary } from "@/types";

// Fixed colour palette for groups
export const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  zinc:    { bg: "bg-zinc-700",    text: "text-zinc-100",   border: "border-zinc-600" },
  emerald: { bg: "bg-emerald-700", text: "text-emerald-100", border: "border-emerald-600" },
  indigo:  { bg: "bg-indigo-700",   text: "text-indigo-100",  border: "border-indigo-600" },
  violet:  { bg: "bg-violet-700",  text: "text-violet-100",  border: "border-violet-600" },
  gold:    { bg: "bg-yellow-600",   text: "text-yellow-50",   border: "border-yellow-500" },
  rose:    { bg: "bg-rose-700",    text: "text-rose-100",    border: "border-rose-600" },
  cyan:    { bg: "bg-cyan-700",    text: "text-cyan-100",    border: "border-cyan-600" },
  orange:  { bg: "bg-orange-700",  text: "text-orange-100",  border: "border-orange-600" },
};

const COLOR_KEYS = Object.keys(GROUP_COLORS);

function GroupChip({ group }: { group: PlayerGroup }) {
  const c = GROUP_COLORS[group.color] ?? GROUP_COLORS.zinc;
  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", c.bg, c.text)}>
      {group.name}
    </span>
  );
}

interface PlayerListProps {
  initialPlayers: PlayerWithStats[];
  initialGroups: PlayerGroup[];
  initialLinks: Map<number, PlayerLinkSummary>;
}

export default function PlayerList({ initialPlayers, initialGroups, initialLinks }: PlayerListProps) {
  const router = useRouter();

  // ── Player state ──────────────────────────────────────────────────────────
  const [players, setPlayers] = useState(initialPlayers);
  const [links, setLinks] = useState(initialLinks);
  const [linkingPlayer, setLinkingPlayer] = useState<PlayerWithStats | null>(null);
  const [showAddLinked, setShowAddLinked] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [assigningGroupId, setAssigningGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Group state ───────────────────────────────────────────────────────────
  const [groups, setGroups] = useState(initialGroups);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("emerald");
  const [newGroupError, setNewGroupError] = useState("");
  const [newGroupLoading, setNewGroupLoading] = useState(false);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("emerald");
  const [editGroupError, setEditGroupError] = useState("");
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
  const [deleteGroupError, setDeleteGroupError] = useState("");
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Player actions ────────────────────────────────────────────────────────
  function startEdit(player: PlayerWithStats) {
    setEditingId(player.id);
    setEditName(player.name);
    setEditError("");
  }

  async function saveEdit(id: number) {
    setEditError("");
    setLoading(true);
    try {
      const player = players.find((p) => p.id === id)!;
      const res = await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), groupId: player.groupId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to rename player");
        return;
      }
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: data.player.name } : p))
      );
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  }

  async function assignGroup(playerId: number, groupId: number | null) {
    setAssigningGroupId(playerId);
    try {
      const player = players.find((p) => p.id === playerId)!;
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: player.name, groupId }),
      });
      if (!res.ok) return;
      const newGroup = groupId === null ? null : (groups.find((g) => g.id === groupId) ?? null);
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, groupId, group: newGroup } : p
        )
      );
    } finally {
      setAssigningGroupId(null);
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

  // ── Group actions ─────────────────────────────────────────────────────────
  async function createGroup() {
    setNewGroupError("");
    setNewGroupLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), color: newGroupColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewGroupError(data.error ?? "Failed to create group");
        return;
      }
      setGroups((prev) => [...prev, data.group].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGroupName("");
      setNewGroupColor("emerald");
      setShowNewGroupForm(false);
    } finally {
      setNewGroupLoading(false);
    }
  }

  function startEditGroup(group: PlayerGroup) {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupColor(group.color);
    setEditGroupError("");
  }

  async function saveEditGroup(id: number) {
    setEditGroupError("");
    setEditGroupLoading(true);
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGroupName.trim(), color: editGroupColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditGroupError(data.error ?? "Failed to update group");
        return;
      }
      const updated: PlayerGroup = data.group;
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? updated : g)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setPlayers((prev) =>
        prev.map((p) => (p.groupId === id ? { ...p, group: updated } : p))
      );
      setEditingGroupId(null);
    } finally {
      setEditGroupLoading(false);
    }
  }

  async function confirmDeleteGroup(id: number) {
    setDeleteGroupError("");
    setDeleteGroupLoading(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteGroupError(data.error ?? "Failed to delete group");
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setPlayers((prev) =>
        prev.map((p) => (p.groupId === id ? { ...p, groupId: null, group: null } : p))
      );
      setDeletingGroupId(null);
    } finally {
      setDeleteGroupLoading(false);
    }
  }

  const deleteTarget = players.find((p) => p.id === deletingId);
  const deleteGroupTarget = groups.find((g) => g.id === deletingGroupId);

  return (
    <div className="space-y-6">
      {/* ── Group management ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Player Groups</h2>
          {!showNewGroupForm && (
            <Button size="sm" variant="secondary" onClick={() => setShowNewGroupForm(true)}>
              New Group
            </Button>
          )}
        </div>

        {groups.length === 0 && !showNewGroupForm && (
          <p className="text-sm text-zinc-500">No groups yet. Create one to start organising players.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {groups.map((group) =>
            editingGroupId === group.id ? (
              <div key={group.id} className="flex w-full flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 sm:w-auto sm:flex-row sm:items-center">
                <Input
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  error={editGroupError}
                  className="w-full sm:w-32"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditGroup(group.id);
                    if (e.key === "Escape") setEditingGroupId(null);
                  }}
                  autoFocus
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {COLOR_KEYS.map((c) => (
                      <button
                        key={c}
                        title={c}
                        onClick={() => setEditGroupColor(c)}
                        className={clsx(
                          "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                          GROUP_COLORS[c].bg,
                          editGroupColor === c ? "border-white" : "border-transparent"
                        )}
                      />
                    ))}
                  </div>
                  <div className="ml-auto flex gap-1 max-[400px]:ml-0 max-[400px]:w-full max-[400px]:justify-center sm:ml-0">
                    <Button size="sm" loading={editGroupLoading} onClick={() => saveEditGroup(group.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGroupId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={group.id} className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5">
                <GroupChip group={group} />
                <button
                  title="Edit group"
                  onClick={() => startEditGroup(group)}
                  className="ml-1 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button
                  title="Delete group"
                  onClick={() => { setDeletingGroupId(group.id); setDeleteGroupError(""); }}
                  className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-950/60 hover:text-red-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )
          )}

          {showNewGroupForm && (
            <div className="flex w-full flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                error={newGroupError}
                className="w-full sm:w-36"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createGroup();
                  if (e.key === "Escape") setShowNewGroupForm(false);
                }}
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {COLOR_KEYS.map((c) => (
                    <button
                      key={c}
                      title={c}
                      onClick={() => setNewGroupColor(c)}
                      className={clsx(
                        "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                        GROUP_COLORS[c].bg,
                        newGroupColor === c ? "border-white" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
                <div className="ml-auto flex gap-1 sm:ml-0">
                  <Button size="sm" loading={newGroupLoading} onClick={createGroup}>
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewGroupForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Player table ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="flex-1"
        />
        <div className="relative flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setShowAddLinked(true)}>
            Add Linked Player
          </Button>
          <div className="group relative">
            <button className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-300">
              ?
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              To add an unlinked player (someone without an account), just type
              their name when recording a session — no need to add them here
              first.
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-zinc-500">
          {search ? "No players match your search." : "No players yet."}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead className="hidden border-b border-zinc-800 bg-zinc-900 sm:table-header-group">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Group
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Sessions
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Added
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((player) => (
              <tr key={player.id} className="block bg-zinc-950 transition-colors hover:bg-zinc-900/50 sm:table-row">
                {/* Name — mobile: top row with name + profit badge */}
                <td className="block px-4 pt-3 pb-0 sm:table-cell sm:py-3 sm:pb-3">
                  {editingId === player.id ? (
                    <div className="flex flex-wrap items-center gap-2">
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
                      <Button size="sm" loading={loading} onClick={() => saveEdit(player.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium text-zinc-100">{player.name}</span>
                  )}
                </td>

                {/* Group */}
                <td className="block px-4 py-1 sm:table-cell sm:py-3">
                  <select
                    value={player.groupId ?? ""}
                    disabled={assigningGroupId === player.id}
                    onChange={(e) =>
                      assignGroup(player.id, e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {player.group && (
                    <span className="ml-2">
                      <GroupChip group={player.group} />
                    </span>
                  )}
                </td>

                {/* Sessions + profit + added — hidden on mobile (shown inline below) */}
                <td className="hidden px-4 py-3 text-right text-sm text-zinc-400 sm:table-cell">
                  {player.sessionCount}
                </td>
                <td className="hidden px-4 py-3 text-right text-sm text-zinc-500 sm:table-cell">
                  {formatDate(player.createdAt)}
                </td>

                {/* Mobile: inline stats row */}
                <td className="block px-4 py-1 sm:hidden">
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span><span className="text-zinc-600">Sessions:</span> {player.sessionCount}</span>
                    <span><span className="text-zinc-600">Added:</span> {formatDate(player.createdAt)}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="block px-4 pb-3 pt-2 sm:table-cell sm:py-3">
                  <div
                    className={clsx(
                      "flex items-center justify-end gap-2",
                      editingId === player.id && "invisible"
                    )}
                  >
                    <Button size="sm" variant="ghost" onClick={() => setLinkingPlayer(player)}>
                      {links.has(player.id) ? (
                        <span className={clsx(
                          "flex items-center gap-1 font-medium",
                          links.get(player.id)!.status === "ACCEPTED"
                            ? "text-emerald-400"
                            : links.get(player.id)!.status === "PENDING"
                            ? "text-yellow-400"
                            : "text-red-400"
                        )}>
                          <UserAvatar avatarId={links.get(player.id)!.linkedUserAvatar} size="xs" />
                          <span>@{links.get(player.id)!.linkedUsername}</span>
                        </span>
                      ) : (
                        "Link"
                      )}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => startEdit(player)}>
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

      {/* ── Delete player modal ────────────────────────────────────────────── */}
      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Delete Player">
        <p className="mb-4 text-sm text-zinc-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-zinc-100">{deleteTarget?.name}</span>?{" "}
          {deleteTarget && deleteTarget.sessionCount > 0 && (
            <span className="text-red-400">
              This player has {deleteTarget.sessionCount} session
              {deleteTarget.sessionCount !== 1 ? "s" : ""} and cannot be deleted.
            </span>
          )}
        </p>
        {deleteError && <p className="mb-4 text-sm text-red-400">{deleteError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!!deleteTarget && deleteTarget.sessionCount > 0}
            onClick={() => deletingId && confirmDelete(deletingId)}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* ── Delete group modal ────────────────────────────────────────────── */}
      <Modal
        open={deletingGroupId !== null}
        onClose={() => setDeletingGroupId(null)}
        title="Delete Group"
      >
        <p className="mb-4 text-sm text-zinc-400">
          Are you sure you want to delete the group{" "}
          <span className="font-semibold text-zinc-100">{deleteGroupTarget?.name}</span>? All
          players in this group will be unassigned.
        </p>
        {deleteGroupError && <p className="mb-4 text-sm text-red-400">{deleteGroupError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingGroupId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteGroupLoading}
            onClick={() => deletingGroupId && confirmDeleteGroup(deletingGroupId)}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* ── Link player modal ─────────────────────────────────────────────── */}
      {linkingPlayer && (
        <LinkPlayerModal
          player={linkingPlayer}
          existingLink={links.get(linkingPlayer.id)}
          onClose={() => setLinkingPlayer(null)}
          onLinked={(link) => setLinks((prev) => new Map(prev).set(link.playerId, link))}
          onUnlinked={(playerId) => setLinks((prev) => { const m = new Map(prev); m.delete(playerId); return m; })}
        />
      )}

      {/* ── Add linked player modal ───────────────────────────────────────── */}
      {showAddLinked && (
        <AddLinkedPlayerModal
          onClose={() => setShowAddLinked(false)}
          onAdded={(player, link) => {
            setPlayers((prev) => [...prev, player]);
            setLinks((prev) => new Map(prev).set(player.id, link));
          }}
        />
      )}
    </div>
  );
}
