"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { clsx } from "clsx";

export interface ComboboxPlayer { id: number; name: string }

export default function PlayerCombobox({
  players,
  value,
  onChange,
  onConfirm,
  placeholder,
}: {
  players: ComboboxPlayer[];
  value: ComboboxPlayer | null;
  onChange: (p: ComboboxPlayer | null) => void;
  onConfirm?: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const matched = players.filter(
    (p) => !trimmed || p.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = matched.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const showAdd = trimmed.length > 0 && !exactMatch;
  const options: ComboboxPlayer[] = showAdd ? [...matched, { id: -1, name: trimmed }] : matched;
  const isOpen = open && options.length > 0;

  function select(opt: ComboboxPlayer) {
    onChange(opt);
    setQuery(opt.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0) { select(options[activeIndex]); return; }
      if (value && onConfirm) { onConfirm(); return; }
      if (trimmed && matched.length === 0) { select({ id: -1, name: trimmed }); return; }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") { setOpen(false); setActiveIndex(-1); }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Search or type a new player name…"}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      {isOpen && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {options.map((opt, i) => (
            <li key={opt.id}>
              <button
                type="button"
                onMouseDown={() => select(opt)}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  i === activeIndex ? "bg-emerald-700 text-white"
                    : opt.id === -1 ? "text-emerald-400 hover:bg-zinc-800"
                    : "text-zinc-200 hover:bg-zinc-800"
                )}
              >
                {opt.id === -1
                  ? <span className="flex items-center gap-1"><span className="text-emerald-400">+</span> Create &ldquo;{trimmed}&rdquo;</span>
                  : opt.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
