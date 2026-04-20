import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import GroupSessionsView from "@/components/breakdowns/GroupSessionsView";
import { serializeSession } from "@/lib/sessionUtils";

export const dynamic = "force-dynamic";

export default async function GroupSessionsPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [rawSessions, rawPlayers, rawGroups] = await Promise.all([
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
    prisma.player.findMany({ where: { userId } }),
    prisma.playerGroup.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const sessions = rawSessions.map(serializeSession);
  const playerGroupMap = Object.fromEntries(
    rawPlayers
      .filter((p) => p.groupId !== null)
      .map((p) => [p.id, p.groupId as number])
  );
  const players = rawPlayers.map((p) => ({ id: p.id, name: p.name, groupId: p.groupId }));

  return (
    <PageWrapper>
      <GroupSessionsView
        sessions={sessions}
        playerGroupMap={playerGroupMap}
        groups={rawGroups}
        players={players}
      />
    </PageWrapper>
  );
}
