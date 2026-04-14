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
  Cell,
} from "recharts";

interface ProfitProbPoint {
  name: string;
  probability: number; // 0–100
}

interface ProfitProbChartProps {
  data: ProfitProbPoint[];
}

type TooltipPayloadItem = {
  payload: ProfitProbPoint;
  value: number;
};

function ProbTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const pct = Math.round(pt.probability);
  return (
    <div
      style={{
        backgroundColor: "#18181b",
        border: "1px solid #3f3f46",
        borderRadius: 8,
        fontSize: 12,
        padding: "8px 12px",
      }}
    >
      <p className="mb-1 font-semibold text-zinc-200">{pt.name}</p>
      <p className="text-zinc-400">
        P(profit):{" "}
        <span className="text-zinc-200">{pct}%</span>
      </p>
      <p className="mt-0.5 text-zinc-500">
        {pct >= 50
          ? `More likely than not to profit (${pct}% chance)`
          : `More likely than not to lose (${100 - pct}% chance of loss)`}
      </p>
    </div>
  );
}

export default function ProfitProbChart({ data }: ProfitProbChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.probability - a.probability);

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 52)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${Math.round(v)}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#d4d4d8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <ReferenceLine x={50} stroke="#52525b" strokeDasharray="4 2" />
        <Tooltip content={<ProbTooltip />} />
        <Bar dataKey="probability" radius={[0, 3, 3, 0]} barSize={14}>
          {sorted.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.probability >= 50 ? "#10b981" : "#f43f5e"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
