import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const LIMIT = 20;

export async function getSessionsPageData(userId: number, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(`sessions:${userId}`, `events:${userId}`, `invites:${userId}`);

  return Promise.all([
    prisma.session.count({ where: { userId } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      include: {
        players: {
          include: {
            player: {
              select: {
                name: true,
                group: { select: { id: true, name: true, color: true } },
              },
            },
          },
          orderBy: { player: { name: "asc" } },
        },
      },
    }),
    prisma.event.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
    prisma.sessionInvite.count({ where: { inviteeId: userId, status: "PENDING" } }),
  ]);
}

export { LIMIT as SESSIONS_PAGE_LIMIT };
