"use client";

import ImpersonateButton from "./ImpersonateButton";

type User = {
  id: number;
  username: string;
  isAdmin: boolean;
  sessions?: number;
  players?: number;
  joinedAt?: string;
};

type Column = "sessions" | "players" | "joined";

export default function AdminUsersTable({
  title,
  users,
  columns,
  currentUserId,
}: {
  title: string;
  users: User[];
  columns: Column[];
  currentUserId: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-300">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="pb-2 font-medium">User</th>
            {columns.includes("joined") && (
              <th className="pb-2 font-medium">Joined</th>
            )}
            {columns.includes("sessions") && (
              <th className="pb-2 font-medium text-right">Sessions</th>
            )}
            {columns.includes("players") && (
              <th className="pb-2 font-medium text-right">Players</th>
            )}
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="py-2.5">
                <span className="font-medium text-zinc-200">{u.username}</span>
                {u.isAdmin && (
                  <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-400">
                    admin
                  </span>
                )}
              </td>
              {columns.includes("joined") && (
                <td className="py-2.5 text-zinc-400">
                  {u.joinedAt
                    ? new Date(u.joinedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
              )}
              {columns.includes("sessions") && (
                <td className="py-2.5 text-right tabular-nums text-zinc-400">
                  {u.sessions ?? 0}
                </td>
              )}
              {columns.includes("players") && (
                <td className="py-2.5 text-right tabular-nums text-zinc-400">
                  {u.players ?? 0}
                </td>
              )}
              <td className="py-2.5 pl-3 text-right">
                {!u.isAdmin && String(u.id) !== currentUserId && (
                  <ImpersonateButton targetUserId={u.id} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
