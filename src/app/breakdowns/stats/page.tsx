import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import PageWrapper from '@/components/layout/PageWrapper';
import BreakdownStatsView from '@/components/breakdowns/stats/BreakdownStatsView';
import StatsPageGuard from '@/components/breakdowns/stats/StatsPageGuard';
import { buildPlayerBreakdowns, buildGroupBreakdowns, getSessionsPerPlayer } from '@/lib/breakdowns';
import { fetchAllForUser } from '@/lib/unified-session';
import { computeLinearAffects } from '@/lib/computeLinearAffects';
import type { PlayerGroup, PlayerBreakdownRow, GroupBreakdownRow, BreakdownStatsItem } from '@/types';

type RawPlayer = { id: number; name: string; groupId: number | null; group: PlayerGroup | null };

export const dynamic = 'force-dynamic';

export default async function BreakdownStatsPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [sessions, rawPlayers, rawGroups, rawStats, user] = await Promise.all([
    fetchAllForUser(userId),
    prisma.player.findMany({
      where: { userId },
      include: { group: true },
    }),
    prisma.playerGroup.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
    prisma.breakdownStats.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { breakdownLastRefreshedAt: true },
    }),
  ]);

  const playerGroupMap = new Map(
    rawPlayers
      .filter((p: RawPlayer) => p.groupId !== null)
      .map((p: RawPlayer) => [p.id, p.groupId as number]),
  );
  const groups: PlayerGroup[] = rawGroups;

  const playerRows: PlayerBreakdownRow[] = buildPlayerBreakdowns(sessions);
  const groupRows: GroupBreakdownRow[] = buildGroupBreakdowns(sessions, groups, playerGroupMap);

  const playerNames = new Map<number, string>(rawPlayers.map((p: RawPlayer) => [p.id, p.name]));
  const qualifyingPlayerIds = [...getSessionsPerPlayer(sessions).entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id]) => id);

  const linearStrict = computeLinearAffects(sessions, qualifyingPlayerIds, playerNames, false);
  const linearInclusive = computeLinearAffects(sessions, qualifyingPlayerIds, playerNames, true);

  const breakdownStats: BreakdownStatsItem[] = rawStats.map(r => ({
    entityType: r.entityType as 'player' | 'group',
    entityId: r.entityId,
    winRateCILow: r.winRateCILow,
    winRateCIHigh: r.winRateCIHigh,
    profitProbability: r.profitProbability,
    expectedValue: r.expectedValue,
    sessionCount: r.sessionCount,
    computedAt: r.computedAt.toISOString(),
  }));

  return (
    <PageWrapper>
      <StatsPageGuard>
        <BreakdownStatsView
          playerRows={playerRows}
          groupRows={groupRows}
          breakdownStats={breakdownStats}
          lastRefreshedAt={user?.breakdownLastRefreshedAt?.toISOString() ?? null}
          linearStrict={linearStrict}
          linearInclusive={linearInclusive}
        />
      </StatsPageGuard>
    </PageWrapper>
  );
}
