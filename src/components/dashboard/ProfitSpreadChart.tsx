"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type { SessionWithPlayers } from "@/types";

interface BoxStat {
  label: string;
  buyIn: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function niceTicks(min: number, max: number, targetCount = 5): number[] {
  const range = max - min;
  if (range === 0) return [Math.round(min)];
  const roughStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const step = normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 0.001; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

function buildBoxData(sessions: SessionWithPlayers[], formatCurrency: (v: number) => string): BoxStat[] {
  const groups = new Map<number, number[]>();
  for (const s of sessions) {
    const existing = groups.get(s.buyIn) ?? [];
    existing.push(s.profit);
    groups.set(s.buyIn, existing);
  }

  return Array.from(groups.entries())
    .filter(([, profits]) => profits.length > 1)
    .sort(([a], [b]) => a - b)
    .map(([buyIn, profits]) => {
      const sorted = [...profits].sort((a, b) => a - b);
      return {
        label: formatCurrency(buyIn),
        buyIn,
        count: sorted.length,
        min: sorted[0],
        q1: percentile(sorted, 25),
        median: percentile(sorted, 50),
        q3: percentile(sorted, 75),
        max: sorted[sorted.length - 1],
      };
    });
}

// Rendered as a direct chart child — Recharts 3 hooks give access to the live scales
function BoxPlotLayer({ data }: { data: BoxStat[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();

  if (!xScale || !yScale || data.length === 0) return null;

  // Derive bandwidth from the start/end pixel positions of the first category
  const bandStart = xScale(data[0].label, { position: "start" });
  const bandEnd = xScale(data[0].label, { position: "end" });
  const bandwidth = bandStart != null && bandEnd != null ? bandEnd - bandStart : 40;
  const boxWidth = Math.max(Math.min(bandwidth * 0.55, 64), 20);
  const capWidth = boxWidth * 0.45;

  return (
    <g>
      {data.map((d) => {
        const cx = xScale(d.label, { position: "middle" });
        const yMin = yScale(d.min);
        const yQ1 = yScale(d.q1);
        const yMedian = yScale(d.median);
        const yQ3 = yScale(d.q3);
        const yMax = yScale(d.max);

        if (cx == null || yMin == null || yQ1 == null || yMedian == null || yQ3 == null || yMax == null) {
          return null;
        }

        const boxTop = Math.min(yQ1, yQ3);
        const boxHeight = Math.abs(yQ1 - yQ3);
        const color = d.median >= 0 ? "#10b981" : "#f87171";

        return (
          <g key={d.buyIn}>
            {/* Whisker: vertical line min→max */}
            <line x1={cx} y1={yMin} x2={cx} y2={yMax} stroke={color} strokeWidth={1.5} strokeOpacity={0.6} />
            {/* Min cap */}
            <line x1={cx - capWidth / 2} y1={yMin} x2={cx + capWidth / 2} y2={yMin} stroke={color} strokeWidth={1.5} />
            {/* Max cap */}
            <line x1={cx - capWidth / 2} y1={yMax} x2={cx + capWidth / 2} y2={yMax} stroke={color} strokeWidth={1.5} />
            {/* IQR box Q1→Q3 */}
            <rect
              x={cx - boxWidth / 2}
              y={boxTop}
              width={boxWidth}
              height={Math.max(boxHeight, 2)}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={1.5}
            />
            {/* Median line */}
            <line
              x1={cx - boxWidth / 2} y1={yMedian}
              x2={cx + boxWidth / 2} y2={yMedian}
              stroke={color} strokeWidth={2.5}
            />
          </g>
        );
      })}
    </g>
  );
}

function BoxTooltip({
  active,
  label,
  data,
}: {
  active?: boolean;
  label?: string;
  data: BoxStat[];
}) {
  const { formatCurrency } = useFormatCurrency();
  if (!active || !label) return null;
  const stat = data.find((d) => d.label === label);
  if (!stat) return null;

  const rows: [string, number][] = [
    ["Max", stat.max],
    ["Q3", stat.q3],
    ["Median", stat.median],
    ["Q1", stat.q1],
    ["Min", stat.min],
  ];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-zinc-200">Buy-in {stat.label}</p>
      <p className="mb-2 text-zinc-500">{stat.count} sessions</p>
      <div className="space-y-0.5">
        {rows.map(([name, value]) => (
          <div key={name} className="flex justify-between gap-4">
            <span className="text-zinc-500">{name}</span>
            <span className={value >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfitSpreadChart({ sessions }: { sessions: SessionWithPlayers[] }) {
  const { formatCurrency } = useFormatCurrency();
  const boxData = buildBoxData(sessions, formatCurrency);

  if (boxData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        Not enough data yet
      </div>
    );
  }

  const allValues = boxData.flatMap((d) => [d.min, d.max]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const yTicks = niceTicks(rawMin, rawMax);
  const yDomain = [yTicks[0], yTicks[yTicks.length - 1]] as [number, number];

  const chartData = boxData.map((d) => ({ label: d.label, _: 0 }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 2" />
        <Tooltip
          content={(props) => (
            <BoxTooltip active={props.active} label={props.label as string} data={boxData} />
          )}
          cursor={{ fill: "#ffffff08" }}
        />
        {/* Invisible bar — ensures Recharts sets up the categorical band scale on XAxis */}
        <Bar dataKey="_" opacity={0} isAnimationActive={false} />
        <BoxPlotLayer data={boxData} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
