"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphData, GraphEdgeType, GraphNodeType } from "@/app/api/admin/relationship-graph/route";
import type ForceGraph from "force-graph";
import type { NodeObject, LinkObject } from "force-graph";

type RuntimeNode = NodeObject & {
  type: GraphNodeType;
  label: string;
  userId?: number;
  sessionCount?: number;
  linkedUserNodeId?: string;
  isSynthetic?: boolean;
};

type RuntimeLink = LinkObject<RuntimeNode> & {
  type: GraphEdgeType;
  strength?: number;
};

type DisplayData = { nodes: RuntimeNode[]; links: RuntimeLink[] };

const USER_RADIUS = 10;
const PLAYER_RADIUS = 5;
const AMBER = "#f59e0b";
const ZINC = "#71717a";

function normaliseStrength(count: number): number {
  return Math.max(1, Math.min(8, Math.log2(count + 1) * 2));
}

function linkColor(edge: RuntimeLink): string {
  if (edge.type === "ownership") return "rgba(113,113,122,0.25)";
  if (edge.type === "equivalence" || edge.type === "implicit-equivalence") return "#0d9488";
  const strength = edge.strength ?? 0;
  const opacity = Math.max(0.2, Math.min(1, 0.2 + (strength / 20) * 0.8));
  return `rgba(245,158,11,${opacity})`;
}

function linkWidth(edge: RuntimeLink): number {
  if (edge.type === "link") return normaliseStrength(edge.strength ?? 0);
  return 1;
}

function linkDash(edge: RuntimeLink): number[] | null {
  return edge.type === "equivalence" || edge.type === "implicit-equivalence" ? [4, 3] : null;
}

function nodeRadius(node: RuntimeNode): number {
  return node.type === "user" ? USER_RADIUS : PLAYER_RADIUS;
}

function paintNode(node: RuntimeNode, ctx: CanvasRenderingContext2D, scale: number) {
  const r = nodeRadius(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = node.type === "user" ? AMBER : ZINC;
  ctx.fill();

  if (node.type === "user") {
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  if (node.isSynthetic) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (node.type === "user") {
    const labelOffset = r + (node.isSynthetic ? 5 : 2);
    const fontSize = Math.max(8, 12 / scale);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = "#e4e4e7";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(node.label, x, y + labelOffset);
  }
}

function paintPointerArea(node: RuntimeNode, color: string, ctx: CanvasRenderingContext2D) {
  const r = nodeRadius(node) + (node.isSynthetic ? 3 : 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
  ctx.fill();
}

// --- Collapse logic ---

function computeDisplayData(
  data: GraphData,
  threshold: number,
  collapsed: boolean
): DisplayData {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  const activeIds = new Set<string>(
    data.nodes
      .filter((n) => n.type === "user" || n.sessionCount >= threshold)
      .map((n) => n.id)
  );

  if (!collapsed) {
    const nodes: RuntimeNode[] = data.nodes
      .filter((n) => activeIds.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        userId: n.userId,
        sessionCount: n.sessionCount,
      }));
    const activeSet = new Set(nodes.map((n) => String(n.id)));
    const links: RuntimeLink[] = data.links
      .filter((l) => activeSet.has(l.source) && activeSet.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, type: l.type, strength: l.strength }));
    return { nodes, links };
  }

  // Union-Find
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p !== x) {
      const root = find(p);
      parent.set(x, root);
      return root;
    }
    return x;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const raIsUser = nodeMap.get(ra)?.type === "user";
    const rbIsUser = nodeMap.get(rb)?.type === "user";
    // Never merge two user roots
    if (raIsUser && rbIsUser) return;
    if (rbIsUser) parent.set(ra, rb);
    else parent.set(rb, ra);
  }

  for (const id of activeIds) find(id);

  for (const link of data.links) {
    if (link.type !== "equivalence" && link.type !== "implicit-equivalence") continue;
    if (activeIds.has(link.source) && activeIds.has(link.target)) {
      union(link.source, link.target);
    }
  }

  for (const node of data.nodes) {
    if (!activeIds.has(node.id) || !node.linkedUserNodeId) continue;
    if (activeIds.has(node.linkedUserNodeId)) {
      union(node.id, node.linkedUserNodeId);
    }
  }

  // Build clusters
  const clusters = new Map<string, string[]>();
  for (const id of activeIds) {
    const root = find(id);
    const arr = clusters.get(root) ?? [];
    arr.push(id);
    clusters.set(root, arr);
  }

  // Build display nodes and representative map
  const reprMap = new Map<string, string>();
  const displayNodes: RuntimeNode[] = [];

  for (const [root, members] of clusters) {
    const rootNode = nodeMap.get(root)!;
    if (rootNode.type === "user") {
      displayNodes.push({ id: root, type: "user", label: rootNode.label });
      for (const m of members) reprMap.set(m, root);
    } else {
      const names = members.map((m) => nodeMap.get(m)!.label);
      const freq = new Map<string, number>();
      for (const name of names) freq.set(name, (freq.get(name) ?? 0) + 1);
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      const label =
        sorted.length === 1
          ? sorted[0][0]
          : sorted.length === 2
            ? `${sorted[0][0]} / ${sorted[1][0]}`
            : `${sorted[0][0]} + ${sorted.length - 1} more`;
      displayNodes.push({
        id: root,
        type: "player",
        label,
        isSynthetic: members.length > 1,
      });
      for (const m of members) reprMap.set(m, root);
    }
  }

  // Remap edges
  const displayNodeIds = new Set(displayNodes.map((n) => String(n.id)));
  const displayNodeTypeMap = new Map(displayNodes.map((n) => [String(n.id), n.type]));
  const seen = new Set<string>();
  const displayLinks: RuntimeLink[] = [];

  for (const link of data.links) {
    const src = reprMap.get(link.source) ?? link.source;
    const tgt = reprMap.get(link.target) ?? link.target;

    if (link.type === "ownership") {
      // Drop only if the player was absorbed into a user node (the link is now implicit).
      // If it merged into a synthetic player cluster, remap and keep it.
      if (displayNodeTypeMap.get(src) === "user") continue;
    }

    if (src === tgt) continue;
    if (!displayNodeIds.has(src) || !displayNodeIds.has(tgt)) continue;

    const key = `${link.type}:${[src, tgt].sort().join(":")}`;
    if (seen.has(key)) {
      if (link.type === "link") {
        const ex = displayLinks.find((l) => {
          const s = l.source as string;
          const t = l.target as string;
          return (s === src && t === tgt) || (s === tgt && t === src);
        });
        if (ex && (link.strength ?? 0) > (ex.strength ?? 0)) ex.strength = link.strength;
      }
      continue;
    }
    seen.add(key);
    displayLinks.push({ source: src, target: tgt, type: link.type, strength: link.strength });
  }

  return { nodes: displayNodes, links: displayLinks };
}

export default function RelationshipGraph() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraph<RuntimeNode, RuntimeLink> | null>(null);
  const displayDataRef = useRef<DisplayData | null>(null);

  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState(false);
  const [threshold, setThreshold] = useState(1);
  const [collapsed, setCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayData = useMemo<DisplayData | null>(() => {
    if (!data) return null;
    return computeDisplayData(data, threshold, collapsed);
  }, [data, threshold, collapsed]);

  displayDataRef.current = displayData;

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    if (!container) return;
    let cancelled = false;

    import("force-graph").then(({ default: ForceGraph }) => {
      if (cancelled) return;
      let fitted = false;
      const graph = new ForceGraph<RuntimeNode, RuntimeLink>(container)
        .width(container.clientWidth)
        .height(container.clientHeight)
        .backgroundColor("#18181b")
        .nodeId("id")
        .nodeLabel("label")
        .nodeCanvasObjectMode(() => "replace")
        .nodeCanvasObject(paintNode)
        .nodePointerAreaPaint(paintPointerArea)
        .linkColor(linkColor)
        .linkWidth(linkWidth)
        .linkLineDash(linkDash)
        .cooldownTicks(120)
        .d3AlphaDecay(0.03)
        .d3VelocityDecay(0.3)
        .onEngineStop(() => {
          if (!fitted) {
            graph.zoomToFit(400, 40);
            fitted = true;
          }
        });

      graphRef.current = graph;

      if (displayDataRef.current) {
        graph.graphData(displayDataRef.current as unknown as { nodes: RuntimeNode[]; links: RuntimeLink[] });
      }
    });

    return () => {
      cancelled = true;
      graphRef.current?._destructor();
      graphRef.current = null;
    };
  }, [container]);

  useEffect(() => {
    if (!displayData || !graphRef.current) return;
    graphRef.current.graphData(displayData as unknown as { nodes: RuntimeNode[]; links: RuntimeLink[] });
  }, [displayData]);

  useEffect(() => {
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      graphRef.current?.width(width).height(height);
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, [container]);

  useEffect(() => {
    fetch("/api/admin/relationship-graph")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-60 text-zinc-500">
        Failed to load graph data.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-60 text-zinc-500 animate-pulse">
        Loading graph...
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 text-zinc-500">
        No data to display.
      </div>
    );
  }

  const visibleNodeCount = displayData?.nodes.length ?? 0;

  return (
    <div className="relative">
      {visibleNodeCount > 300 && (
        <p className="absolute top-2 left-2 z-10 text-amber-400 text-xs bg-zinc-900/80 px-2 py-1 rounded">
          {visibleNodeCount} nodes — rendering may be slow.
        </p>
      )}

      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Filters
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4 shadow-xl">
            <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
              Min sessions
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                className="rounded px-2 py-1.5 bg-zinc-900 border border-zinc-600 text-zinc-100 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={collapsed}
                onChange={(e) => setCollapsed(e.target.checked)}
                className="accent-amber-400"
              />
              Collapse Equivalent People
            </label>
          </div>
        )}
      </div>

      <div
        ref={setContainerRef}
        className="w-full h-150 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800"
      />
    </div>
  );
}
