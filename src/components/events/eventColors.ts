export const EVENT_COLORS: Record<string, { hex: string; text: string; bg: string; dot: string }> = {
  emerald: { hex: "#10b981", text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  blue:    { hex: "#3b82f6", text: "text-blue-400",    bg: "bg-blue-500/10",    dot: "bg-blue-500" },
  orange:  { hex: "#f97316", text: "text-orange-400",  bg: "bg-orange-500/10",  dot: "bg-orange-500" },
  purple:  { hex: "#a855f7", text: "text-purple-400",  bg: "bg-purple-500/10",  dot: "bg-purple-500" },
  red:     { hex: "#ef4444", text: "text-red-400",     bg: "bg-red-500/10",     dot: "bg-red-500" },
  yellow:  { hex: "#eab308", text: "text-yellow-400",  bg: "bg-yellow-500/10",  dot: "bg-yellow-500" },
  pink:    { hex: "#ec4899", text: "text-pink-400",    bg: "bg-pink-500/10",    dot: "bg-pink-500" },
  cyan:    { hex: "#06b6d4", text: "text-cyan-400",    bg: "bg-cyan-500/10",    dot: "bg-cyan-500" },
};

export const EVENT_COLOR_OPTIONS = Object.keys(EVENT_COLORS) as (keyof typeof EVENT_COLORS)[];

export function getEventColor(color: string) {
  return EVENT_COLORS[color] ?? EVENT_COLORS.emerald;
}
