"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface AvgProfitChartProps {
  data: { name: string; avgProfit: number }[];
}

export default function AvgProfitChart({ data }: AvgProfitChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.avgProfit - a.avgProfit);

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 44)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#d4d4d8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <ReferenceLine x={0} stroke="#52525b" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Avg profit"]}
        />
        <Bar
          dataKey="avgProfit"
          radius={[0, 3, 3, 0]}
          fill="#10b981"
          // negative bars rendered in red via a custom cell approach isn't
          // straightforward with recharts; use a neutral colour that works for both
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
