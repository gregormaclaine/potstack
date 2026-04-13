"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import type { TopPlayer } from "@/types";

interface TopPlayersChartProps {
  data: TopPlayer[];
}

export default function TopPlayersChart({ data }: TopPlayersChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#d4d4d8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Profit"]}
        />
        <Bar dataKey="totalProfit" radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.totalProfit >= 0 ? "#10b981" : "#ef4444"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
