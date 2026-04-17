import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export async function getPlayersPageData(userId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`players:${userId}`, `groups:${userId}`, `links:${userId}`);

  return Promise.all([
    prisma.player.findMany({
      where: { userId },
      include: {
        group: true,
        sessions: {
          select: {
            profit: true,
            session: { select: { profit: true } },
          },
        },
      },
    }),
    prisma.playerGroup.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.playerLink.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        ownerPlayerId: true,
        status: true,
        linkedUser: { select: { username: true } },
      },
    }),
    prisma.playerLink.findMany({
      where: { linkedUserId: userId, status: "ACCEPTED", linkedPlayerId: { not: null } },
      select: {
        id: true,
        linkedPlayerId: true,
        status: true,
        ownerUser: { select: { username: true } },
      },
    }),
  ]);
}
