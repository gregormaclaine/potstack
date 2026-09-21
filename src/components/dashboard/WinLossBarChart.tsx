"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import {
  DEFAULT_WIN_LOSS_GROUPING,
  groupWinLossPoints,
  type WinLossBucket,
  type WinLossGrouping,
} from "@/lib/winLossGrouping";
import type { WinLossPoint } from "@/types";

interface WinLossBarChartProps {
  data: WinLossPoint[];
  grouping?: WinLossGrouping;
}

function ProfitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number; payload?: WinLossBucket }>;
}) {
  const { formatCurrency } = useFormatCurrency();
  if (!active || !payload?.length) return null;

  const value = Number(payload[0]?.value ?? 0);
  const label = payload[0]?.payload?.label;
  const color = value >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      {label && <div className="mb-1 text-zinc-400">{label}</div>}
      <div style={{ color }}>{formatCurrency(value)}</div>
    </div>
  );
}

export default function WinLossBarChart({
  data,
  grouping = DEFAULT_WIN_LOSS_GROUPING,
}: WinLossBarChartProps) {
  const { formatCurrency } = useFormatCurrency();
  const buckets = groupWinLossPoints(data, grouping);

  // Ticks are looked up by category value rather than index, since recharts
  // drops ticks when the bars get crowded.
  const tickByKey = new Map(buckets.map((b) => [b.key, b.tick]));

  if (buckets.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={buckets}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="key"
          tickFormatter={(v: string) => tickByKey.get(v) ?? v}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<ProfitTooltip />} />
        <ReferenceLine y={0} stroke="#52525b" />
        <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
          {buckets.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
