"use client";

import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import { clsx } from "clsx";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Player {
  id: number;
  name: string;
}

interface PlayerSearchComboboxProps {
  onSelect: (player: Player) => void;
  onPlayerCreated?: (id: number) => void;
  excludeIds?: number[];
  placeholder?: string;
}

export default function PlayerSearchCombobox({
  onSelect,
  onPlayerCreated,
  excludeIds = [],
  placeholder = "Search or add player...",
}: PlayerSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [preloaded, setPreloaded] = useState<Player[]>([]);
  const [preloading, setPreloading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch top 100 players by session count once on mount
  useEffect(() => {
    fetch("/api/players?limit=100")
      .then((r) => r.json())
      .then((data) => setPreloaded(data.players as Player[]))
      .finally(() => setPreloading(false));
  }, []);

  const trimmed = query.trim();

  // Client-side filter: case-insensitive includes, already sorted by session count
  const matched = preloaded.filter(
    (p) =>
      !excludeIds.includes(p.id) &&
      (!trimmed || p.name.toLowerCase().includes(trimmed.toLowerCase()))
  );

  const exactMatch = matched.some(
    (r) => r.name.toLowerCase() === trimmed.toLowerCase()
  );
  const showAddOption = trimmed.length > 0 && !exactMatch;
  const allOptions: Player[] = showAddOption
    ? [...matched, { id: -1, name: trimmed }]
    : matched;

  const open = focused && allOptions.length > 0;

  async function handleAddNew() {
    setCreating(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        const newPlayer: Player = data.player;
        setPreloaded((prev) => [newPlayer, ...prev]);
        onPlayerCreated?.(newPlayer.id);
        onSelect(newPlayer);
        setQuery("");
        setFocused(false);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(option: Player) {
    if (option.id === -1) {
      handleAddNew();
    } else {
      onSelect(option);
      setQuery("");
      setFocused(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      // Pick the top existing match; do nothing if there are none
      if (matched.length > 0) {
        e.preventDefault();
        // Don't setFocused(false) — focus stays on the input, so keep the
        // dropdown open and ready for the next player immediately.
        onSelect(matched[0]);
        setQuery("");
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === "Enter") {
      // Always block Enter from bubbling to the form
      e.preventDefault();
      if (open && activeIndex >= 0) {
        handleSelect(allOptions[activeIndex]);
      } else if (trimmed.length > 0 && matched.length === 0) {
        // No existing players match — trigger Add
        handleAddNew();
      }
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={preloading ? "Loading players…" : placeholder}
          disabled={creating}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
        {creating && <LoadingSpinner size="sm" />}
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {allOptions.map((option, i) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(option)}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  i === activeIndex
                    ? "bg-emerald-700 text-white"
                    : option.id === -1
                    ? "text-emerald-400 hover:bg-zinc-800"
                    : "text-zinc-200 hover:bg-zinc-800"
                )}
              >
                {option.id === -1 ? (
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-400">+</span> Add &ldquo;{trimmed}&rdquo;
                  </span>
                ) : (
                  option.name
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
