"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface Props {
  sessionId: number;
  sessionPlayerId: number;
  reshare?: boolean;
}

export default function SharePlayerButton({ sessionId, sessionPlayerId, reshare }: Props) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (sent) {
    return (
      <span title="Invite pending" className="inline-flex items-center rounded-full border border-amber-700 bg-amber-950 p-1 text-amber-400">
        <PendingIcon />
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
        setSent(true);
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
      {reshare ? "Reshare" : "Share"}
    </button>
  );
}

function PendingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
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
