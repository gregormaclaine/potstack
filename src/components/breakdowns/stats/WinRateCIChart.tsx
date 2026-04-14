"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ErrorBar,
} from "recharts";

interface WinRateCIPoint {
  name: string;
  winRate: number;
  ciLow: number;
  ciHigh: number;
}

interface WinRateCIChartProps {
  data: WinRateCIPoint[];
}

// recharts ErrorBar expects [lowerDelta, upperDelta] from the bar value
function toErrorBarValue(pt: WinRateCIPoint) {
  return [pt.winRate - pt.ciLow, pt.ciHigh - pt.winRate] as [number, number];
}

type TooltipPayloadItem = {
  payload: WinRateCIPoint;
  value: number;
};

function CITooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
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
        Win rate: <span className="text-zinc-200">{Math.round(pt.winRate)}%</span>
      </p>
      <p className="text-zinc-400">
        95% CI:{" "}
        <span className="text-zinc-200">
          {Math.round(pt.ciLow)}% – {Math.round(pt.ciHigh)}%
        </span>
      </p>
    </div>
  );
}

export default function WinRateCIChart({ data }: WinRateCIChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.winRate - a.winRate);

  // Attach the error bar deltas as a field
  const chartData = sorted.map((pt) => ({
    ...pt,
    ciError: toErrorBarValue(pt),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 52)}>
      <ComposedChart
        layout="vertical"
        data={chartData}
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
        <Tooltip content={<CITooltip />} />
        <Bar dataKey="winRate" fill="#6366f1" fillOpacity={0.85} radius={[0, 3, 3, 0]} barSize={14}>
          <ErrorBar
            dataKey="ciError"
            width={6}
            strokeWidth={2}
            stroke="#a5b4fc"
            direction="x"
          />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
