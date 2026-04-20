"use client";

import { clsx } from "clsx";
import { useFormatCurrency } from "@/contexts/SettingsContext";

interface StatCardProps {
  title: string;
  value?: string;
  currency?: number;
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
  currency,
  subtitle,
  trend = "neutral",
}: StatCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const displayValue = currency !== undefined ? formatCurrency(currency) : (value ?? "");

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
        {displayValue}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}
