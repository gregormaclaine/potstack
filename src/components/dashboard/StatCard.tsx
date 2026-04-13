import { clsx } from "clsx";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

const trendClasses = {
  up: "text-emerald-400",
  down: "text-red-400",
  neutral: "text-zinc-400",
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend = "neutral",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <p
        className={clsx(
          "mt-1 text-2xl font-bold tabular-nums",
          trendClasses[trend]
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}
