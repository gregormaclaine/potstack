"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import PageWrapper from "@/components/layout/PageWrapper";
import UserAvatar from "@/components/ui/UserAvatar";
import { AVATARS } from "@/lib/avatars";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(
    session?.user?.avatar ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentAvatar = session?.user?.avatar ?? null;
  const isDirty = selected !== currentAvatar;

  async function save() {
    if (!isDirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      await update({ avatar: selected });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <UserAvatar avatarId={selected} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Choose Your Avatar
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              @{session?.user?.name} &mdash; pick your poker persona
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {AVATARS.map((av) => {
            const isSelected = selected === av.id;
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => setSelected(av.id)}
                className={clsx(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  isSelected
                    ? "border-amber-500 bg-amber-950/40"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800"
                )}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                    ✓
                  </span>
                )}
                <UserAvatar avatarId={av.id} size="md" />
                <span
                  className={clsx(
                    "text-center text-[10px]",
                    isSelected ? "text-amber-400" : "text-zinc-500"
                  )}
                >
                  {av.name}
                </span>
                <span className="text-center text-[9px] text-zinc-600">
                  {av.hand}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!isDirty || saving}
            className={clsx(
              "rounded-lg px-6 py-2 text-sm font-bold transition-all",
              isDirty && !saving
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "cursor-not-allowed bg-zinc-800 text-zinc-500"
            )}
          >
            {saving ? "Saving…" : "Save Avatar"}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
