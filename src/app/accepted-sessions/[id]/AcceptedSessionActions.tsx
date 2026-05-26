"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface Props {
  acceptedSessionId: number;
  initialLocalLocation: string | null;
  originalLocation: string | null;
  initialLocalNotes: string | null;
  originalNotes: string | null;
}

export default function AcceptedSessionActions({
  acceptedSessionId,
  initialLocalLocation,
  originalLocation,
  initialLocalNotes,
  originalNotes,
}: Props) {
  const router = useRouter();
  const [localLocation, setLocalLocation] = useState(initialLocalLocation ?? "");
  const [editingLocation, setEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [localNotes, setLocalNotes] = useState(initialLocalNotes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [makingCopy, setMakingCopy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  async function saveLocation() {
    setSavingLocation(true);
    await fetch(`/api/accepted-sessions/${acceptedSessionId}/local-location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localLocation: localLocation.trim() || null }),
    });
    setSavingLocation(false);
    setEditingLocation(false);
    router.refresh();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/accepted-sessions/${acceptedSessionId}/local-location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localNotes: localNotes.trim() || null }),
    });
    setSavingNotes(false);
    setEditingNotes(false);
    router.refresh();
  }

  async function makeCopy() {
    setMakingCopy(true);
    const res = await fetch(`/api/accepted-sessions/${acceptedSessionId}/make-copy`, { method: "POST" });
    const data = await res.json() as { newSessionId?: number };
    setMakingCopy(false);
    if (data.newSessionId) router.push(`/sessions/${data.newSessionId}`);
  }

  async function remove() {
    setRemoving(true);
    await fetch(`/api/accepted-sessions/${acceptedSessionId}`, { method: "DELETE" });
    setRemoving(false);
    router.push("/sessions");
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {editingLocation ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localLocation}
              onChange={(e) => setLocalLocation(e.target.value)}
              placeholder={originalLocation ?? "Add location…"}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <Button size="sm" onClick={saveLocation} disabled={savingLocation}>
              {savingLocation ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingLocation(false)}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={() => setEditingLocation(true)}
            className="self-start text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {localLocation.trim() ? "Edit my location" : "Override location"}
          </button>
        )}

        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder={originalNotes ?? "Add your notes…"}
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="self-start text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {localNotes.trim() ? "Edit my notes" : "Add my notes"}
          </button>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={makeCopy} disabled={makingCopy}>
            {makingCopy ? "Copying…" : "Make a copy"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setRemoveConfirmOpen(true)}>
            Remove
          </Button>
        </div>
      </div>

      <Modal
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        title="Remove shared session"
      >
        <p className="mb-4 text-sm text-zinc-400">
          Remove this shared session from your list? You can re-accept the invite from your notifications if needed.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={remove} disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
