"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!session?.isImpersonating) return null;

  async function handleStop() {
    setLoading(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      await update({ impersonation: null });
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-amber-500/40 bg-amber-950/90 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-amber-400">Impersonating</span>
        <span className="font-bold text-white">{session.user.name}</span>
        <span className="text-amber-500/60">·</span>
        <span className="text-amber-300/70">
          Logged in as <span className="font-medium text-amber-300">{session.impersonatorName}</span>
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={loading}
        className="rounded border border-amber-500/50 px-3 py-1 text-xs font-medium text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-200 disabled:opacity-50"
      >
        {loading ? "Stopping..." : "Stop Impersonating"}
      </button>
    </div>
  );
}
