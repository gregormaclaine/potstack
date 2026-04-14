import { prisma } from "@/lib/prisma";
import { getSessionsPerPlayer, getSessionsPerGroup } from "@/lib/breakdowns";
import { bootstrapWinRateCI, probabilityOfProfit } from "@/lib/bootstrap";
import { serializeSession } from "@/lib/sessionUtils";
import type { SessionWithPlayers } from "@/types";

/**
 * Fetch all sessions + player/group data for a user, run bootstrap resampling
 * for each player and group entity, and upsert the results to BreakdownStats.
 *
 * Does NOT update User.breakdownLastRefreshedAt — that is only updated on
 * manual refresh to enforce the rate limit.
 */
export async function computeAndSaveBreakdownStats(userId: number): Promise<void> {
  const [rawSessions, rawPlayers] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        players: {
          include: { player: { select: { name: true } } },
          orderBy: { player: { name: "asc" } },
        },
      },
    }),
    prisma.player.findMany({
      where: { userId },
      select: { id: true, groupId: true },
    }),
  ]);

  const sessions: SessionWithPlayers[] = rawSessions.map(serializeSession);

  const playerGroupMap = new Map(
    rawPlayers
      .filter((p): p is typeof p & { groupId: number } => p.groupId !== null)
      .map((p) => [p.id, p.groupId])
  );

  // Build per-entity session lists
  const sessionsByPlayer = getSessionsPerPlayer(sessions);
  const sessionsByGroup = getSessionsPerGroup(sessions, playerGroupMap);

  // Compute stats for each entity
  type UpsertData = {
    userId: number;
    entityType: string;
    entityId: number;
    winRateCILow: number;
    winRateCIHigh: number;
    profitProbability: number;
    expectedValue: number;
    sessionCount: number;
  };

  const upserts: UpsertData[] = [];

  for (const [playerId, playerSessions] of sessionsByPlayer.entries()) {
    const profits = playerSessions.map((s) => s.profit);
    const ci = bootstrapWinRateCI(profits);
    upserts.push({
      userId,
      entityType: "player",
      entityId: playerId,
      winRateCILow: ci.low,
      winRateCIHigh: ci.high,
      profitProbability: probabilityOfProfit(profits),
      expectedValue: profits.reduce((s, p) => s + p, 0) / profits.length,
      sessionCount: profits.length,
    });
  }

  for (const [groupId, groupSessions] of sessionsByGroup.entries()) {
    const profits = groupSessions.map((s) => s.profit);
    const ci = bootstrapWinRateCI(profits);
    upserts.push({
      userId,
      entityType: "group",
      entityId: groupId,
      winRateCILow: ci.low,
      winRateCIHigh: ci.high,
      profitProbability: probabilityOfProfit(profits),
      expectedValue: profits.reduce((s, p) => s + p, 0) / profits.length,
      sessionCount: profits.length,
    });
  }

  // Upsert all rows
  await Promise.all(
    upserts.map((data) =>
      prisma.breakdownStats.upsert({
        where: {
          userId_entityType_entityId: {
            userId: data.userId,
            entityType: data.entityType,
            entityId: data.entityId,
          },
        },
        create: data,
        update: {
          winRateCILow: data.winRateCILow,
          winRateCIHigh: data.winRateCIHigh,
          profitProbability: data.profitProbability,
          expectedValue: data.expectedValue,
          sessionCount: data.sessionCount,
        },
      })
    )
  );

  // Delete stale entries for players/groups that no longer qualify
  const validPlayerIds = [...sessionsByPlayer.keys()];
  const validGroupIds = [...sessionsByGroup.keys()];

  await prisma.breakdownStats.deleteMany({
    where: {
      userId,
      OR: [
        validPlayerIds.length > 0
          ? { entityType: "player", entityId: { notIn: validPlayerIds } }
          : { entityType: "player" },
        validGroupIds.length > 0
          ? { entityType: "group", entityId: { notIn: validGroupIds } }
          : { entityType: "group" },
      ],
    },
  });
}
