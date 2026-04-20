import type {
  SessionWithPlayers,
  SessionPlayerDetail,
  PlayerBreakdownRow,
  GroupBreakdownRow,
  PlayerGroup,
  CumulativePlayerPoint,
  CumulativePlayerMeta,
  GroupSessionDetail,
} from "@/types";

const PLAYER_LINE_COLORS: string[] = [
  "#10b981", // emerald — always "You"
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#84cc16", // lime
  "#e879f9", // fuchsia
];

interface PlayerMeta {
  name: string;
  group: PlayerGroup | null;
}

function buildRow(
  sessions: SessionWithPlayers[]
): Omit<PlayerBreakdownRow | GroupBreakdownRow, "playerId" | "groupId" | "name" | "color" | "group"> {
  const profits = sessions.map((s) => s.profit);
  const totalBuyIn = sessions.reduce((sum, s) => sum + s.buyIn, 0);
  const totalCashOut = sessions.reduce((sum, s) => sum + s.cashOut, 0);
  const profit = sessions.reduce((sum, s) => sum + s.profit, 0);
  const avgProfit = sessions.length > 0 ? profit / sessions.length : 0;
  const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
  const maxLoss = profits.length > 0 ? Math.min(...profits) : 0;
  const wins = profits.filter((p) => p > 0).length;
  const winRate = sessions.length > 0 ? (wins / sessions.length) * 100 : 0;
  return { sessions: sessions.length, totalBuyIn, totalCashOut, profit, avgProfit, maxProfit, maxLoss, winRate };
}

/**
 * Returns a map of playerId → sessions[] for all players with ≥ minSessions appearances.
 * Used by both buildPlayerBreakdowns and computeBreakdownStats.
 */
export function getSessionsPerPlayer(
  sessions: SessionWithPlayers[],
  minSessions = 3
): Map<number, SessionWithPlayers[]> {
  const map = new Map<number, SessionWithPlayers[]>();

  for (const session of sessions) {
    for (const sp of session.players) {
      const existing = map.get(sp.playerId);
      if (existing) {
        existing.push(session);
      } else {
        map.set(sp.playerId, [session]);
      }
    }
  }

  for (const [playerId, playerSessions] of map.entries()) {
    if (playerSessions.length < minSessions) map.delete(playerId);
  }

  return map;
}

export type SessionGroupLabel = { id: number | null; name: string; color: string };

/**
 * Returns the predominant groups for a single session's player list.
 * - Returns [Ungrouped] if more than half of all players have no group.
 * - Otherwise returns every group that makes up at least half of the grouped players.
 * Mirrors the per-session logic inside getSessionsPerGroup.
 */
export function getSessionPredominantGroups(
  players: SessionPlayerDetail[]
): SessionGroupLabel[] {
  if (players.length === 0) return [];

  let playersWithAnyGroup = 0;
  const groupCounts = new Map<number, { name: string; color: string; count: number }>();

  for (const p of players) {
    const group = p.group ?? null;
    if (group) {
      playersWithAnyGroup++;
      const existing = groupCounts.get(group.id);
      if (existing) {
        existing.count++;
      } else {
        groupCounts.set(group.id, { name: group.name, color: group.color, count: 1 });
      }
    }
  }

  const ungroupedCount = players.length - playersWithAnyGroup;
  if (ungroupedCount / players.length > 0.5) {
    return [{ id: null, name: "Ungrouped", color: "zinc" }];
  }

  const result: SessionGroupLabel[] = [];
  if (playersWithAnyGroup > 0) {
    for (const [id, { name, color, count }] of groupCounts.entries()) {
      if (count / playersWithAnyGroup >= 0.5) {
        result.push({ id, name, color });
      }
    }
  }
  return result;
}

/**
 * Returns a map of groupId → sessions[] plus a special key of -1 for Ungrouped sessions.
 * Used by both buildGroupBreakdowns and computeBreakdownStats.
 */
export function getSessionsPerGroup(
  sessions: SessionWithPlayers[],
  playerGroupMap: Map<number, number> // playerId → groupId
): Map<number, SessionWithPlayers[]> {
  const map = new Map<number, SessionWithPlayers[]>();
  const ungroupedSessions: SessionWithPlayers[] = [];

  for (const session of sessions) {
    const totalPlayers = session.players.length;
    if (totalPlayers === 0) continue;

    let playersWithAnyGroup = 0;
    const groupCounts = new Map<number, number>();
    for (const sp of session.players) {
      const gid = playerGroupMap.get(sp.playerId);
      if (gid !== undefined) {
        playersWithAnyGroup += 1;
        groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1);
      }
    }

    if (playersWithAnyGroup > 0) {
      for (const [gid, count] of groupCounts.entries()) {
        if (count / playersWithAnyGroup >= 0.5) {
          const existing = map.get(gid);
          if (existing) {
            existing.push(session);
          } else {
            map.set(gid, [session]);
          }
        }
      }
    }

    const ungroupedCount = totalPlayers - playersWithAnyGroup;
    if (ungroupedCount / totalPlayers > 0.5) {
      ungroupedSessions.push(session);
    }
  }

  if (ungroupedSessions.length > 0) {
    map.set(-1, ungroupedSessions);
  }

  return map;
}

/**
 * Aggregate my session stats grouped by each opponent player.
 * A session is included in a player's row if that player appeared in the session.
 */
export function buildPlayerBreakdowns(
  sessions: SessionWithPlayers[],
  playerMetas: Map<number, PlayerMeta>
): PlayerBreakdownRow[] {
  const map = getSessionsPerPlayer(sessions);

  const rows: PlayerBreakdownRow[] = [];
  for (const [playerId, playerSessions] of map.entries()) {
    const meta = playerMetas.get(playerId);
    rows.push({
      playerId,
      name: meta?.name ?? `Player #${playerId}`,
      group: meta?.group ?? null,
      ...buildRow(playerSessions),
    });
  }

  return rows.sort((a, b) => b.sessions - a.sessions);
}

/**
 * Returns all sessions where any opponent belongs to the given group.
 * Used by the Group Sessions Explorer (as opposed to the ≥50% majority rule).
 */
export function getSessionsForGroup(
  sessions: SessionWithPlayers[],
  groupId: number,
  playerGroupMap: Map<number, number>,
): SessionWithPlayers[] {
  return sessions.filter((s) =>
    s.players.some((sp) => playerGroupMap.get(sp.playerId) === groupId)
  );
}

export interface GroupSessionPlayerRow {
  key: string;
  name: string;
  isMe: boolean;
  sessions: number;
  totalBuyIn: number | null;
  totalCashOut: number | null;
  profit: number | null;
  avgProfit: number | null;
  maxProfit: number | null;
  maxLoss: number | null;
  winRate: number | null;
}

/**
 * Builds per-player breakdown rows for the Group Sessions Explorer.
 * Only includes opponents who belong to groupId. Includes a "You" row for the logged-in user.
 * Opponent numeric fields are null when no data has been recorded.
 */
export function buildGroupSessionPlayerRows(
  filteredSessions: SessionWithPlayers[],
  groupId: number,
  playerGroupMap: Map<number, number>,
  extraPlayerIds: Set<number> = new Set(),
): GroupSessionPlayerRow[] {
  // "You" row — always has complete data
  const youRow: GroupSessionPlayerRow = {
    key: "me",
    name: "You",
    isMe: true,
    sessions: filteredSessions.length,
    totalBuyIn: filteredSessions.reduce((s, r) => s + r.buyIn, 0),
    totalCashOut: filteredSessions.reduce((s, r) => s + r.cashOut, 0),
    profit: filteredSessions.reduce((s, r) => s + r.profit, 0),
    avgProfit: filteredSessions.length > 0
      ? filteredSessions.reduce((s, r) => s + r.profit, 0) / filteredSessions.length
      : 0,
    maxProfit: filteredSessions.length > 0 ? Math.max(...filteredSessions.map((r) => r.profit)) : 0,
    maxLoss: filteredSessions.length > 0 ? Math.min(...filteredSessions.map((r) => r.profit)) : 0,
    winRate: filteredSessions.length > 0
      ? (filteredSessions.filter((r) => r.profit > 0).length / filteredSessions.length) * 100
      : 0,
  };

  // Opponent rows
  const opponentMap = new Map<number, {
    name: string;
    appearances: number;
    buyIns: number[];
    cashOuts: number[];
    profits: number[];
  }>();

  for (const session of filteredSessions) {
    for (const sp of session.players) {
      if (playerGroupMap.get(sp.playerId) !== groupId && !extraPlayerIds.has(sp.playerId)) continue;
      const existing = opponentMap.get(sp.playerId);
      if (existing) {
        existing.appearances++;
        if (sp.buyIn !== null) existing.buyIns.push(sp.buyIn);
        if (sp.cashOut !== null) existing.cashOuts.push(sp.cashOut);
        if (sp.profit !== null) existing.profits.push(sp.profit);
      } else {
        opponentMap.set(sp.playerId, {
          name: sp.playerName,
          appearances: 1,
          buyIns: sp.buyIn !== null ? [sp.buyIn] : [],
          cashOuts: sp.cashOut !== null ? [sp.cashOut] : [],
          profits: sp.profit !== null ? [sp.profit] : [],
        });
      }
    }
  }

  const opponentRows: GroupSessionPlayerRow[] = [];
  for (const [playerId, data] of opponentMap.entries()) {
    const { profits } = data;
    opponentRows.push({
      key: `player_${playerId}`,
      name: data.name,
      isMe: false,
      sessions: data.appearances,
      totalBuyIn: data.buyIns.length > 0 ? data.buyIns.reduce((s, v) => s + v, 0) : null,
      totalCashOut: data.cashOuts.length > 0 ? data.cashOuts.reduce((s, v) => s + v, 0) : null,
      profit: profits.length > 0 ? profits.reduce((s, v) => s + v, 0) : null,
      avgProfit: profits.length > 0 ? profits.reduce((s, v) => s + v, 0) / profits.length : null,
      maxProfit: profits.length > 0 ? Math.max(...profits) : null,
      maxLoss: profits.length > 0 ? Math.min(...profits) : null,
      winRate: profits.length > 0 ? (profits.filter((p) => p > 0).length / profits.length) * 100 : null,
    });
  }

  opponentRows.sort((a, b) => b.sessions - a.sessions);
  return [youRow, ...opponentRows];
}

/**
 * Builds cumulative profit over time per player for the Group Sessions Explorer chart.
 * Only includes opponents who belong to groupId. Returns chart data points (one per session)
 * and player metadata for rendering lines.
 */
export function buildCumulativeByPlayer(
  filteredSessions: SessionWithPlayers[],
  groupId: number,
  playerGroupMap: Map<number, number>,
  extraPlayerIds: Set<number> = new Set(),
): {
  points: CumulativePlayerPoint[];
  players: CumulativePlayerMeta[];
} {
  if (filteredSessions.length === 0) return { points: [], players: [] };

  // Collect group-member player keys in first-appearance order
  const allKeys: string[] = ["me"];
  const nameMap = new Map<string, string>([["me", "You"]]);

  for (const session of filteredSessions) {
    for (const sp of session.players) {
      if (playerGroupMap.get(sp.playerId) !== groupId && !extraPlayerIds.has(sp.playerId)) continue;
      const key = `player_${sp.playerId}`;
      if (!nameMap.has(key)) {
        allKeys.push(key);
        nameMap.set(key, sp.playerName);
      }
    }
  }

  // Assign colors — "me" always gets PLAYER_LINE_COLORS[0]
  const colorMap = new Map<string, string>();
  for (let i = 0; i < allKeys.length; i++) {
    colorMap.set(allKeys[i], PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length]);
  }

  // Build cumulative points
  const cumulative = new Map<string, number>(allKeys.map((k) => [k, 0]));

  // Zero-origin point (sessionIndex 0, same date as first session)
  const zeroPoint: CumulativePlayerPoint = { sessionIndex: 0, date: filteredSessions[0].date };
  for (const key of allKeys) zeroPoint[key] = 0;
  const points: CumulativePlayerPoint[] = [zeroPoint];

  for (let i = 0; i < filteredSessions.length; i++) {
    const session = filteredSessions[i];

    // Update "me"
    cumulative.set("me", (cumulative.get("me") ?? 0) + session.profit);

    // Update each opponent key (carry-forward if absent or null)
    for (const key of allKeys) {
      if (key === "me") continue;
      const playerId = Number(key.replace("player_", ""));
      const sp = session.players.find((p) => p.playerId === playerId);
      if (sp && sp.profit !== null) {
        cumulative.set(key, (cumulative.get(key) ?? 0) + sp.profit);
      }
      // else: carry forward — value unchanged
    }

    const point: CumulativePlayerPoint = { sessionIndex: i + 1, date: session.date };
    for (const key of allKeys) {
      point[key] = cumulative.get(key) ?? 0;
    }
    points.push(point);
  }

  const players: CumulativePlayerMeta[] = allKeys.map((key) => ({
    key,
    name: nameMap.get(key) ?? key,
    color: colorMap.get(key) ?? "#71717a",
  }));

  return { points, players };
}

/**
 * Builds per-session detail rows for the Group Sessions Explorer side table.
 */
export function buildGroupSessionDetails(
  filteredSessions: SessionWithPlayers[],
  groupId: number,
  playerGroupMap: Map<number, number>,
  extraPlayerIds: Set<number> = new Set(),
): GroupSessionDetail[] {
  return filteredSessions.map((session) => {
    const isGroupMember = (playerId: number) =>
      playerGroupMap.get(playerId) === groupId || extraPlayerIds.has(playerId);

    const nonGroupPlayers = session.players.filter(
      (sp) => !isGroupMember(sp.playerId)
    ).length;

    const totalOnTable =
      session.buyIn +
      session.players.reduce((sum, sp) => sum + (sp.buyIn ?? 0), 0);

    const groupNetRaw =
      session.profit +
      session.players
        .filter((sp) => isGroupMember(sp.playerId) && sp.profit !== null)
        .reduce((sum, sp) => sum + (sp.profit ?? 0), 0);
    const groupNet = Math.round(groupNetRaw * 100) / 100;

    return {
      sessionId: session.id,
      date: session.date,
      totalPlayers: session.players.length + 1,
      nonGroupPlayers,
      totalOnTable,
      groupNet,
    };
  });
}

/**
 * Aggregate my session stats grouped by player group.
 * A session qualifies for a group if at least half of the non-me players
 * in that session belong to that group.
 */
export function buildGroupBreakdowns(
  sessions: SessionWithPlayers[],
  groups: PlayerGroup[],
  playerGroupMap: Map<number, number> // playerId → groupId
): GroupBreakdownRow[] {
  const map = getSessionsPerGroup(sessions, playerGroupMap);

  const ungroupedSessions = map.get(-1) ?? [];
  const rows = groups
    .filter((g) => map.has(g.id))
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      color: g.color,
      ...buildRow(map.get(g.id)!),
    }))
    .sort((a, b) => b.sessions - a.sessions);

  if (ungroupedSessions.length > 0) {
    rows.push({
      groupId: -1,
      name: "Ungrouped",
      color: "zinc",
      ...buildRow(ungroupedSessions),
    });
  }

  return rows;
}
