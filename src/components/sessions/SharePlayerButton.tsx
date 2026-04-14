"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

type InviteStatus = "PENDING" | "ACCEPTED" | "REJECTED";

interface Props {
  sessionId: number;
  sessionPlayerId: number;
  initialStatus: InviteStatus | null;
}

const statusConfig: Record<InviteStatus, { label: string; classes: string }> = {
  PENDING:  { label: "Invite pending",  classes: "text-amber-400 border-amber-700 bg-amber-950" },
  ACCEPTED: { label: "Invite accepted", classes: "text-emerald-400 border-emerald-800 bg-emerald-950" },
  REJECTED: { label: "Invite rejected", classes: "text-red-400 border-red-800 bg-red-950" },
};

export default function SharePlayerButton({ sessionId, sessionPlayerId, initialStatus }: Props) {
  const [status, setStatus] = useState<InviteStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (status !== null) {
    const { label, classes } = statusConfig[status];
    return (
      <span
        title={label}
        className={clsx(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          classes
        )}
      >
        {label}
      </span>
    );
  }

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/share-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionPlayerId }),
      });
      if (res.ok) {
        const data = await res.json() as { invite: { status: InviteStatus } };
        setStatus(data.invite.status);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Share session with this player"
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 transition-colors",
        loading
          ? "cursor-not-allowed opacity-50"
          : "hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
      )}
    >
      <SendIcon />
      Share
    </button>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 19-7z" />
    </svg>
  );
}
