"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { EVENT_COLOR_OPTIONS, getEventColor } from "./eventColors";
import type { PokerEvent, CreateEventBody, UpdateEventBody } from "@/types";
import clsx from "clsx";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (event: PokerEvent) => void;
  onDeleted?: (id: number) => void;
  editing?: PokerEvent | null;
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export default function EventModal({ open, onClose, onSaved, onDeleted, editing }: EventModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [color, setColor] = useState("emerald");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setStartDate(toDateInput(editing.startDate));
        setEndDate(toDateInput(editing.endDate));
        setColor(editing.color);
      } else {
        setName("");
        setStartDate("");
        setEndDate("");
        setColor("emerald");
      }
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, editing]);

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Name is required"); return; }
    if (!startDate || !endDate) { setError("Both dates are required"); return; }
    if (new Date(startDate) > new Date(endDate)) { setError("Start date must be before end date"); return; }

    setSaving(true);
    try {
      const url = editing ? `/api/events/${editing.id}` : "/api/events";
      const method = editing ? "PUT" : "POST";
      const body: CreateEventBody | UpdateEventBody = { name: name.trim(), startDate, endDate, color };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save event");
        return;
      }
      const data = await res.json();
      onSaved(data.event as PokerEvent);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    try {
      await fetch(`/api/events/${editing.id}`, { method: "DELETE" });
      onDeleted?.(editing.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Event" : "Create Event"}>
      <div className="flex flex-col gap-4">
        <Input
          id="event-name"
          label="Event Name"
          placeholder="e.g. Vegas Trip"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="event-start"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            id="event-end"
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Color</p>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLOR_OPTIONS.map((c) => {
              const cols = getEventColor(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    "h-7 w-7 rounded-full transition-transform",
                    cols.dot,
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : "opacity-70 hover:opacity-100"
                  )}
                  title={c}
                />
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          {editing && !confirmDelete && (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          {editing && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Sure?</span>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>Yes, delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          )}
          {!editing && <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
