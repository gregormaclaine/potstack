import type { SessionWithPlayers, DashboardStats, TopPlayer } from "@/types";

export function buildDashboardStats(
  sessions: SessionWithPlayers[]
): DashboardStats {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalSessions = sorted.length;
  const totalProfit = sorted.reduce((sum, s) => sum + s.profit, 0);
  const wins = sorted.filter((s) => s.profit > 0).length;
  const winRate = totalSessions > 0 ? (wins / totalSessions) * 100 : 0;
  const avgProfitPerSession =
    totalSessions > 0 ? totalProfit / totalSessions : 0;

  const profits = sorted.map((s) => s.profit);
  const biggestWin = profits.length > 0 ? Math.max(...profits) : 0;
  const biggestLoss = profits.length > 0 ? Math.min(...profits) : 0;

  let cumulative = 0;
  const profitOverTime = sorted.map((s) => {
    cumulative += s.profit;
    return {
      date: s.date,
      sessionProfit: s.profit,
      cumulativeProfit: cumulative,
    };
  });

  const winLossPerSession = sorted.map((s) => ({
    sessionId: s.id,
    date: s.date,
    profit: s.profit,
  }));

  // Aggregate players by session count; track profit only if recorded
  const playerMap = new Map<
    number,
    { name: string; sessions: number; totalProfit: number | null }
  >();
  for (const session of sorted) {
    for (const sp of session.players) {
      const existing = playerMap.get(sp.playerId);
      if (existing) {
        existing.sessions += 1;
        if (sp.profit !== null) {
          existing.totalProfit = (existing.totalProfit ?? 0) + sp.profit;
        }
      } else {
        playerMap.set(sp.playerId, {
          name: sp.playerName,
          sessions: 1,
          totalProfit: sp.profit !== null ? sp.profit : null,
        });
      }
    }
  }

  const topPlayers: TopPlayer[] = Array.from(playerMap.entries())
    .map(([playerId, data]) => ({ playerId, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  const recentSessions = [...sorted].reverse().slice(0, 5);

  return {
    totalSessions,
    totalProfit,
    winRate,
    avgProfitPerSession,
    biggestWin,
    biggestLoss,
    profitOverTime,
    winLossPerSession,
    topPlayers,
    recentSessions,
  };
}
