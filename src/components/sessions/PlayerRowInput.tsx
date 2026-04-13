import Badge from "@/components/ui/Badge";

interface PlayerRowInputProps {
  index: number;
  playerName: string;
  buyIn: number;
  cashOut: number;
  onChange: (index: number, field: "buyIn" | "cashOut", value: number) => void;
  onRemove: (index: number) => void;
}

export default function PlayerRowInput({
  index,
  playerName,
  buyIn,
  cashOut,
  onChange,
  onRemove,
}: PlayerRowInputProps) {
  const profit = cashOut - buyIn;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">
        {playerName}
      </span>

      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">Buy-in</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            £
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={buyIn}
            onChange={(e) => onChange(index, "buyIn", Number(e.target.value))}
            className="w-24 rounded border border-zinc-700 bg-zinc-800 py-1.5 pl-5 pr-2 text-right text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">Cash-out</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            £
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={cashOut}
            onChange={(e) => onChange(index, "cashOut", Number(e.target.value))}
            className="w-24 rounded border border-zinc-700 bg-zinc-800 py-1.5 pl-5 pr-2 text-right text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <Badge value={profit} />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="ml-1 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
        aria-label={`Remove ${playerName}`}
      >
        ✕
      </button>
    </div>
  );
}
