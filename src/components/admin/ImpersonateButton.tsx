"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ImpersonateButton({ targetUserId }: { targetUserId: number }) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleImpersonate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { userId: string; username: string };
      await update({ impersonation: { userId: data.userId, username: data.username } });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 transition hover:border-amber-500 hover:text-amber-400 disabled:opacity-40"
    >
      {loading ? "..." : "Impersonate"}
    </button>
  );
}
