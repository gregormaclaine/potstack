"use client";

import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ErrorBar,
  ResponsiveContainer,
} from "recharts";
import { useFormatCurrency } from "@/contexts/SettingsContext";
import type { LinearAffectsPlayerResult } from "@/lib/computeLinearAffects";

interface LinearAffectsChartProps {
  data: LinearAffectsPlayerResult[];
}

type ChartPoint = {
  name: string;
  mean: number;
  ciLow: number;
  ciHigh: number;
  ciError: [number, number];
};

type TooltipPayloadItem = {
  payload: ChartPoint;
};

function LinearAffectsTooltip({
  active,
  payload,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  formatValue: (v: number) => string;
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
        Est. effect: <span className="text-zinc-200">{formatValue(pt.mean)}</span>
      </p>
      <p className="text-zinc-400">
        90% CI:{" "}
        <span className="text-zinc-200">
          {formatValue(pt.ciLow)} – {formatValue(pt.ciHigh)}
        </span>
      </p>
    </div>
  );
}

function niceTickStep(range: number, targetCount = 6): number {
  const raw = range / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function generateTicks(min: number, max: number): number[] {
  const step = niceTickStep(max - min);
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + 1e-9; t += step) {
    ticks.push(Math.round(t));
  }
  return ticks;
}

const VERTICAL_BAR_WIDTH = 100;
const HORIZONTAL_THRESHOLD = 6;

export default function LinearAffectsChart({ data }: LinearAffectsChartProps) {
  const { formatCurrency } = useFormatCurrency();

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.mean - a.mean);

  const chartData: ChartPoint[] = sorted.map(d => ({
    name: d.playerName,
    mean: d.mean,
    ciLow: d.ciLow,
    ciHigh: d.ciHigh,
    ciError: [d.mean - d.ciLow, d.ciHigh - d.mean],
  }));

  const allValues = data.flatMap(d => [d.ciLow, d.ciHigh]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const pad = (rawMax - rawMin) * 0.15 || 10;
  const domainMin = Math.min(rawMin - pad, 0);
  const domainMax = Math.max(rawMax + pad, 0);
  const formatValue = (v: number) => (v < 0 ? `-${formatCurrency(-v)}` : formatCurrency(v));

  if (data.length < HORIZONTAL_THRESHOLD) {
    // Horizontal bar chart — suits a small number of players, no scrolling needed.
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
            domain={[domainMin, domainMax]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#d4d4d8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <ReferenceLine x={0} stroke="#52525b" strokeDasharray="4 2" />
          <Tooltip content={<LinearAffectsTooltip formatValue={formatValue} />} />
          <Bar dataKey="mean" fillOpacity={0.85} radius={[0, 3, 3, 0]} barSize={14}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.mean >= 0 ? "#10b981" : "#f43f5e"} />
            ))}
            <ErrorBar dataKey="ciError" width={6} strokeWidth={2} stroke="#a1a1aa" direction="x" />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Vertical bar chart with horizontal scroll — suits larger player counts.
  const ticks = generateTicks(domainMin, domainMax);
  const chartWidth = Math.max(400, sorted.length * VERTICAL_BAR_WIDTH);

  return (
    <div className="overflow-x-auto">
      <ComposedChart
        width={chartWidth}
        height={420}
        data={chartData}
        margin={{ top: 16, right: 24, left: 8, bottom: 56 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#d4d4d8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          type="number"
          domain={[domainMin, domainMax]}
          ticks={ticks}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={70}
        />
        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 2" />
        <Tooltip content={<LinearAffectsTooltip formatValue={formatValue} />} />
        <Bar dataKey="mean" fillOpacity={0.85} radius={[3, 3, 0, 0]} barSize={28}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.mean >= 0 ? "#10b981" : "#f43f5e"} />
          ))}
          <ErrorBar dataKey="ciError" width={6} strokeWidth={2} stroke="#a1a1aa" direction="y" />
        </Bar>
      </ComposedChart>
    </div>
  );
}
