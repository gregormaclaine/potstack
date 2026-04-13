import { clsx } from "clsx";
import { formatCurrency } from "@/lib/formatters";

interface BadgeProps {
  value: number;
  format?: "currency" | "percent";
  className?: string;
}

export default function Badge({
  value,
  format = "currency",
  className,
}: BadgeProps) {
  const label =
    format === "currency"
      ? (value > 0 ? "+" : "") + formatCurrency(value)
      : `${value > 0 ? "+" : ""}${Math.round(value)}%`;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
        value > 0 && "bg-emerald-900/60 text-emerald-300",
        value < 0 && "bg-red-900/60 text-red-300",
        value === 0 && "bg-zinc-700 text-zinc-400",
        className
      )}
    >
      {label}
    </span>
  );
}
