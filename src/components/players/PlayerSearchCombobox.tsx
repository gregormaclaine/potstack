"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
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
  excludeIds?: number[];
  placeholder?: string;
}

export default function PlayerSearchCombobox({
  onSelect,
  excludeIds = [],
  placeholder = "Search or add player...",
}: PlayerSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/players?search=${encodeURIComponent(q)}&limit=20`
        );
        const data = await res.json();
        setResults(
          (data.players as Player[]).filter((p) => !excludeIds.includes(p.id))
        );
      } finally {
        setLoading(false);
      }
    },
    [excludeIds]
  );

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      search(query);
      setOpen(true);
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, search]);

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showAddOption = query.trim().length > 0 && !exactMatch;
  const allOptions = showAddOption
    ? [...results, { id: -1, name: `Add "${query.trim()}"` }]
    : results;

  async function handleAddNew() {
    setCreating(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onSelect(data.player);
        setQuery("");
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(player: Player) {
    if (player.id === -1) {
      handleAddNew();
    } else {
      onSelect(player);
      setQuery("");
      setOpen(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || allOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(allOptions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
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
          onFocus={() => query.trim() && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={creating}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
        {(loading || creating) && <LoadingSpinner size="sm" />}
      </div>

      {open && allOptions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-lg"
        >
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
                    <span className="text-emerald-400">+</span>{" "}
                    Add &ldquo;{query.trim()}&rdquo;
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
