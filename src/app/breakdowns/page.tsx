import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import BreakdownsView from "@/components/breakdowns/BreakdownsView";
import { serializeSession } from "@/lib/sessionUtils";
import type { SessionWithPlayers, PlayerGroup } from "@/types";

type RawPlayer = { id: number; name: string; groupId: number | null; group: PlayerGroup | null };

export default async function BreakdownsPage() {
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
    prisma.player.findMany({
      where: { userId },
      include: { group: true },
    }),
    prisma.playerGroup.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
  ]);

  const sessions: SessionWithPlayers[] = rawSessions.map(serializeSession);

  const playerMetas = new Map(
    rawPlayers.map((p: RawPlayer) => [p.id, { name: p.name, group: p.group }])
  );

  const playerGroupMap = new Map(
    rawPlayers.filter((p: RawPlayer) => p.groupId !== null).map((p: RawPlayer) => [p.id, p.groupId as number])
  );

  const groups: PlayerGroup[] = rawGroups;

  return (
    <PageWrapper>
      <BreakdownsView
        sessions={sessions}
        playerMetas={Object.fromEntries(playerMetas)}
        playerGroupMap={Object.fromEntries(playerGroupMap)}
        groups={groups}
      />
    </PageWrapper>
  );
}
