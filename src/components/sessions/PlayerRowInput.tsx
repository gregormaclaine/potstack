import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import UserAvatar from "@/components/ui/UserAvatar";
import type { LinkStatus } from "@/types";

interface PlayerRowInputProps {
  index: number;
  playerName: string;
  buyIn: number | null;
  cashOut: number | null;
  linkStatus?: LinkStatus | null;
  linkedUsername?: string;
  linkedUserAvatar?: string | null;
  onChangeBuyIn: (index: number, value: number | null) => void;
  onChangeCashOut: (index: number, value: number | null) => void;
  onRemove: (index: number) => void;
  onLink: (index: number) => void;
}

// Controlled currency input: allows free typing, selects all on focus,
// no spinner buttons, defaults empty to 0 on blur.
function CurrencyInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number | null;
  onChange: (v: number) => void;
  autoFocus?: boolean;
}) {
  const [raw, setRaw] = useState(value === null ? "" : String(value));

  // If the parent resets value to null (tracking disabled), clear raw
  useEffect(() => {
    if (value === null) setRaw("");
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
        £
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => {
          const v = e.target.value;
          // Allow digits, one optional dot, and empty string
          if (/^\d*\.?\d*$/.test(v)) setRaw(v);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          const num = parseFloat(raw);
          const final = isNaN(num) ? 0 : num;
          setRaw(String(final));
          onChange(final);
        }}
        autoFocus={autoFocus}
        className="w-24 rounded border border-zinc-700 bg-zinc-800 py-1.5 pl-5 pr-2 text-right text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

function LinkStatusChip({
  status,
  username,
  avatar,
  onLink,
}: {
  status?: LinkStatus | null;
  username?: string;
  avatar?: string | null;
  onLink: () => void;
}) {
  if (status === "ACCEPTED") {
    return (
      <button
        type="button"
        onClick={onLink}
        title={`Linked to @${username}`}
        className="flex items-center gap-1 rounded-full bg-emerald-600/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
      >
        <UserAvatar avatarId={avatar} size="xs" />
        <span>@{username}</span>
      </button>
    );
  }
  if (status === "PENDING") {
    return (
      <button
        type="button"
        onClick={onLink}
        title={`Pending link request to @${username}`}
        className="flex items-center gap-1 rounded-full bg-yellow-600/20 px-1.5 py-0.5 text-xs font-medium text-yellow-400 hover:bg-yellow-600/30 transition-colors"
      >
        <UserAvatar avatarId={avatar} size="xs" />
        <span>@{username}</span>
      </button>
    );
  }
  if (status === "REJECTED") {
    return (
      <button
        type="button"
        onClick={onLink}
        title="Link request was rejected — click to manage"
        className="flex items-center gap-1 rounded-full bg-red-600/20 px-1.5 py-0.5 text-xs font-medium text-red-400 hover:bg-red-600/30 transition-colors"
      >
        <UserAvatar avatarId={avatar} size="xs" />
        <span>@{username}</span>
      </button>
    );
  }
  // No link
  return (
    <button
      type="button"
      onClick={onLink}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap"
    >
      + Link
    </button>
  );
}

export default function PlayerRowInput({
  index,
  playerName,
  buyIn,
  cashOut,
  linkStatus,
  linkedUsername,
  linkedUserAvatar,
  onChangeBuyIn,
  onChangeCashOut,
  onRemove,
  onLink,
}: PlayerRowInputProps) {
  const tracking = buyIn !== null;
  const profit = tracking ? (cashOut ?? 0) - buyIn : null;

  function enableTracking() {
    onChangeBuyIn(index, 0);
    onChangeCashOut(index, 0);
  }

  function disableTracking() {
    onChangeBuyIn(index, null);
    onChangeCashOut(index, null);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">
          {playerName}
        </span>

        <LinkStatusChip
          status={linkStatus}
          username={linkedUsername}
          avatar={linkedUserAvatar}
          onLink={() => onLink(index)}
        />
      </div>

      {!tracking && (
        <button
          type="button"
          onClick={enableTracking}
          className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          + Track results
        </button>
      )}

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
        aria-label={`Remove ${playerName}`}
      >
        ✕
      </button>

      {tracking && (
        <div className="flex w-full items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Buy-in</span>
            <CurrencyInput
              value={buyIn}
              onChange={(v) => onChangeBuyIn(index, v)}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Cash-out</span>
            <CurrencyInput
              value={cashOut}
              onChange={(v) => onChangeCashOut(index, v)}
            />
          </div>

          {profit !== null && <Badge value={profit} />}

          <button
            type="button"
            onClick={disableTracking}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Stop tracking results"
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}
