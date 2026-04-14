"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TopPlayer } from "@/types";

interface TopPlayersChartProps {
  data: TopPlayer[];
}

export default function TopPlayersChart({ data }: TopPlayersChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No players recorded yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "sessions", position: "insideRight", offset: -5, fill: "#52525b", fontSize: 10 }}
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
          formatter={(value) => [`${value} sessions`, "Played together"]}
        />
        <Bar dataKey="sessions" fill="#6366f1" fillOpacity={0.85} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
