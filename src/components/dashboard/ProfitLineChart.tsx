"use client";

import { useState } from "react";
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
import { clsx } from "clsx";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { ProfitOverTimePoint } from "@/types";

interface ProfitLineChartProps {
  data: ProfitOverTimePoint[];
}

export default function ProfitLineChart({ data }: ProfitLineChartProps) {
  const [dateScale, setDateScale] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const chartData = data.map((p, i) => ({
    ...p,
    index: i,
    timestamp: new Date(p.date).getTime() + i,
  }));

  return (
    <div>
      <div className="mb-1 flex justify-end">
        <button
          onClick={() => setDateScale((v) => !v)}
          className={clsx(
            "rounded px-2 py-0.5 text-xs font-medium transition-colors",
            dateScale
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          )}
        >
          By date
        </button>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          {dateScale ? (
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickCount={6}
              tickFormatter={(v) => formatDate(new Date(v).toISOString(), "d MMM")}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
            />
          ) : (
            <XAxis
              dataKey="index"
              tickFormatter={(v) => formatDate(chartData[v as number]?.date ?? "", "d MMM")}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
            />
          )}
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
            labelFormatter={(v) =>
              dateScale
                ? formatDate(new Date(v as number).toISOString())
                : formatDate(chartData[v as number]?.date ?? "")
            }
            formatter={(value) => [formatCurrency(Number(value)), "Cumulative"]}
          />
          <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="cumulativeProfit"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
