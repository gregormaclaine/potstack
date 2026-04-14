"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { SessionInviteItem } from "@/types";

interface PendingSessionInvitesProps {
  initialInvites: SessionInviteItem[];
}

export default function PendingSessionInvites({ initialInvites }: PendingSessionInvitesProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());

  async function respond(id: number, action: "accept" | "reject") {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;
      if (action === "accept") {
        setAcceptedIds((prev) => new Set(prev).add(id));
      } else {
        setInvites((prev) => prev.filter((inv) => inv.id !== id));
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (invites.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing here.</p>;
  }

  return (
    <ul className="space-y-3">
      {invites.map((inv) => {
        const accepted = acceptedIds.has(inv.id);
        return (
          <li
            key={inv.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 space-y-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {formatDate(inv.session.date)}
                  {inv.session.location && (
                    <span className="ml-2 font-normal text-zinc-400">@ {inv.session.location}</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  from <span className="text-zinc-400">@{inv.requesterUsername}</span> — playing as{" "}
                  <span className="text-zinc-400">{inv.playerName}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {inv.sessionPlayer.buyIn != null && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-600 text-xs mr-1">Buy-in</span>
                    {formatCurrency(inv.sessionPlayer.buyIn)}
                  </span>
                )}
                {inv.sessionPlayer.cashOut != null && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-600 text-xs mr-1">Cash-out</span>
                    {formatCurrency(inv.sessionPlayer.cashOut)}
                  </span>
                )}
                {inv.sessionPlayer.profit != null && (
                  <Badge value={inv.sessionPlayer.profit} />
                )}
              </div>
            </div>
            {accepted ? (
              <p className="text-sm text-emerald-400">Session added to your account.</p>
            ) : (
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  loading={loadingId === inv.id}
                  onClick={() => respond(inv.id, "reject")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  loading={loadingId === inv.id}
                  onClick={() => respond(inv.id, "accept")}
                >
                  Accept
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
