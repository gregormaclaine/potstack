"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { CumulativePlayerPoint, CumulativePlayerMeta } from "@/types";

interface CumulativeProfitByPlayerChartProps {
  points: CumulativePlayerPoint[];
  players: CumulativePlayerMeta[];
}

export default function CumulativeProfitByPlayerChart({
  points,
  players,
}: CumulativeProfitByPlayerChartProps) {
  if (points.length === 0 || players.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="sessionIndex"
          tickFormatter={(v) => formatDate(points[(v as number) - 1]?.date ?? "", "d MMM")}
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
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(v) => {
            const pt = points[(v as number) - 1];
            return pt ? `Session ${v} — ${formatDate(pt.date)}` : `Session ${v}`;
          }}
          formatter={(value, name) => {
            const player = players.find((p) => p.key === name);
            return [formatCurrency(Number(value)), player?.name ?? String(name)];
          }}
          itemSorter={(item) => -(item.value as number)}
        />
        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 2" />
        {players.map((p) => (
          <Line
            key={p.key}
            type="monotone"
            dataKey={p.key}
            stroke={p.color}
            strokeWidth={p.key === "me" ? 2.5 : 1.5}
            dot={false}
            activeDot={{ r: 4, fill: p.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
