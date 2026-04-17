import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export async function getDashboardData(userId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`sessions:${userId}`, `events:${userId}`);
  console.log(`[cache-probe] getDashboardData called for userId=${userId} at ${Date.now()}`);

  return Promise.all([
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
    prisma.event.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
  ]);
}
