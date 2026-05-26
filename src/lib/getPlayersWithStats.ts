import { prisma } from '@/lib/prisma';
import { fetchAllForUser } from '@/lib/unified-session';
import type { PlayerWithStats, PlayerLinkSummary, LinkStatus } from '@/types';

type PlayerStats = { sessionCount: number; totalProfit: number; sessionProfitSum: number };

export async function getPlayersWithStats(userId: number): Promise<{
  players: PlayerWithStats[];
  initialLinks: Map<number, PlayerLinkSummary>;
}> {
  const [allSessions, rawPlayers, rawSentLinks, rawReceivedLinks] = await Promise.all([
    fetchAllForUser(userId),
    prisma.player.findMany({ where: { userId }, include: { group: true } }),
    prisma.playerLink.findMany({
      where: { ownerUserId: userId },
      select: { id: true, ownerPlayerId: true, status: true, linkedUser: { select: { username: true, avatar: true } } },
    }),
    prisma.playerLink.findMany({
      where: { linkedUserId: userId, status: 'ACCEPTED', linkedPlayerId: { not: null } },
      select: { id: true, linkedPlayerId: true, status: true, ownerUser: { select: { username: true, avatar: true } } },
    }),
  ]);

  // One pass over all sessions (owned + accepted) to accumulate per-player stats.
  // session.profit is always the user's own profit; sp.profit is the opponent's individual profit.
  const statsMap = new Map<number, PlayerStats>();
  for (const session of allSessions) {
    for (const sp of session.players) {
      if (sp.playerId === null) continue;
      const existing = statsMap.get(sp.playerId);
      if (existing) {
        existing.sessionCount += 1;
        existing.totalProfit += sp.profit ?? 0;
        existing.sessionProfitSum += session.profit;
      } else {
        statsMap.set(sp.playerId, {
          sessionCount: 1,
          totalProfit: sp.profit ?? 0,
          sessionProfitSum: session.profit,
        });
      }
    }
  }

  const players = rawPlayers
    .map((p) => {
      const stats = statsMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
        groupId: p.groupId,
        group: p.group,
        sessionCount: stats?.sessionCount ?? 0,
        totalProfit: stats?.totalProfit ?? 0,
        avgSessionProfit: stats ? stats.sessionProfitSum / stats.sessionCount : 0,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const initialLinks = new Map<number, PlayerLinkSummary>();
  for (const l of rawSentLinks) {
    initialLinks.set(l.ownerPlayerId, {
      id: l.id,
      status: l.status as LinkStatus,
      linkedUsername: l.linkedUser.username,
      linkedUserAvatar: l.linkedUser.avatar,
      playerId: l.ownerPlayerId,
    });
  }
  for (const l of rawReceivedLinks) {
    if (l.linkedPlayerId !== null && !initialLinks.has(l.linkedPlayerId)) {
      initialLinks.set(l.linkedPlayerId, {
        id: l.id,
        status: 'ACCEPTED',
        linkedUsername: l.ownerUser.username,
        linkedUserAvatar: l.ownerUser.avatar,
        playerId: l.linkedPlayerId,
      });
    }
  }

  return { players, initialLinks };
}
