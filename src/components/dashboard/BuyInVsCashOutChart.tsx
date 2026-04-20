"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/formatters";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type { SessionWithPlayers } from "@/types";

interface BuyInVsCashOutChartProps {
  sessions: SessionWithPlayers[];
}

export default function BuyInVsCashOutChart({ sessions }: BuyInVsCashOutChartProps) {
  const { formatCurrency } = useFormatCurrency();
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const data = sessions.map((s) => ({
    date: s.date,
    buyIn: s.buyIn,
    cashOut: s.cashOut,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v, "d MMM")}
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
          labelFormatter={(v) => formatDate(v as string)}
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === "buyIn" ? "Buy-in" : "Cash-out",
          ]}
        />
        <Legend
          formatter={(v) => (v === "buyIn" ? "Buy-in" : "Cash-out")}
          wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
        />
        <Bar dataKey="buyIn" fill="#6366f1" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
        <Bar dataKey="cashOut" fill="#10b981" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
