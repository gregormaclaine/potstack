import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { computeAndSaveBreakdownStats } from "@/lib/computeBreakdownStats";
import type { BreakdownStatsItem } from "@/types";
import { captureEvent } from "@/lib/posthog";

const REFRESH_RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

function serializeStats(rows: {
  entityType: string;
  entityId: number;
  winRateCILow: number;
  winRateCIHigh: number;
  profitProbability: number;
  expectedValue: number;
  sessionCount: number;
  computedAt: Date;
}[]): BreakdownStatsItem[] {
  return rows.map((r) => ({
    entityType: r.entityType as "player" | "group",
    entityId: r.entityId,
    winRateCILow: r.winRateCILow,
    winRateCIHigh: r.winRateCIHigh,
    profitProbability: r.profitProbability,
    expectedValue: r.expectedValue,
    sessionCount: r.sessionCount,
    computedAt: r.computedAt.toISOString(),
  }));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const [rows, user] = await Promise.all([
    prisma.breakdownStats.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { breakdownLastRefreshedAt: true },
    }),
  ]);

  return NextResponse.json({
    stats: serializeStats(rows),
    lastRefreshedAt: user?.breakdownLastRefreshedAt?.toISOString() ?? null,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { breakdownLastRefreshedAt: true },
  });

  if (user?.breakdownLastRefreshedAt) {
    const elapsed = Date.now() - user.breakdownLastRefreshedAt.getTime();
    if (elapsed < REFRESH_RATE_LIMIT_MS) {
      const retryAfter = Math.ceil((REFRESH_RATE_LIMIT_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: "Rate limited", retryAfter },
        { status: 429 }
      );
    }
  }

  await computeAndSaveBreakdownStats(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { breakdownLastRefreshedAt: new Date() },
  });

  const [rows, updatedUser] = await Promise.all([
    prisma.breakdownStats.findMany({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { breakdownLastRefreshedAt: true },
    }),
  ]);

  captureEvent(session.user.name ?? `userId[${userId}]`, "breakdown stats refreshed");

  return NextResponse.json({
    stats: serializeStats(rows),
    lastRefreshedAt: updatedUser?.breakdownLastRefreshedAt?.toISOString() ?? null,
  });
}
