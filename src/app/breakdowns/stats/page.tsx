import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import BreakdownStatsView from "@/components/breakdowns/stats/BreakdownStatsView";
import StatsPageGuard from "@/components/breakdowns/stats/StatsPageGuard";
import { buildPlayerBreakdowns, buildGroupBreakdowns } from "@/lib/breakdowns";
import { fetchAllForUser } from "@/lib/unified-session";
import type { PlayerGroup, PlayerBreakdownRow, GroupBreakdownRow, BreakdownStatsItem } from "@/types";

type RawPlayer = { id: number; name: string; groupId: number | null; group: PlayerGroup | null };

export const dynamic = "force-dynamic";

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
      orderBy: { name: "asc" },
    }),
    prisma.breakdownStats.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { breakdownLastRefreshedAt: true },
    }),
  ]);

  const playerMetas = new Map(
    rawPlayers.map((p: RawPlayer) => [p.id, { name: p.name, group: p.group }])
  );
  const playerGroupMap = new Map(
    rawPlayers
      .filter((p: RawPlayer) => p.groupId !== null)
      .map((p: RawPlayer) => [p.id, p.groupId as number])
  );
  const groups: PlayerGroup[] = rawGroups;

  const playerRows: PlayerBreakdownRow[] = buildPlayerBreakdowns(sessions, playerMetas);
  const groupRows: GroupBreakdownRow[] = buildGroupBreakdowns(sessions, groups, playerGroupMap);

  const breakdownStats: BreakdownStatsItem[] = rawStats.map((r) => ({
    entityType: r.entityType as "player" | "group",
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
        />
      </StatsPageGuard>
    </PageWrapper>
  );
}
