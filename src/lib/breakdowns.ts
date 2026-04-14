import type {
  SessionWithPlayers,
  SessionPlayerDetail,
  PlayerBreakdownRow,
  GroupBreakdownRow,
  PlayerGroup,
} from "@/types";

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
