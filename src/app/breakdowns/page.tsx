import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import PageWrapper from '@/components/layout/PageWrapper';
import BreakdownsView from '@/components/breakdowns/BreakdownsView';
import { fetchAllForUser } from '@/lib/unified-session';

export const dynamic = 'force-dynamic';

export default async function BreakdownsPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [sessions, rawPlayers, rawGroups] = await Promise.all([
    fetchAllForUser(userId),
    prisma.player.findMany({ where: { userId }, include: { group: true } }),
    prisma.playerGroup.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  const playerMetas = rawPlayers.map(p => [p.id, { name: p.name, group: p.group }] as [number, { name: string; group: typeof p.group }]);

  const playerGroupMap = new Map(
    rawPlayers.filter(p => p.groupId !== null).map(p => [p.id, p.groupId as number]),
  );

  return (
    <PageWrapper>
      <BreakdownsView
        sessions={sessions}
        playerMetas={playerMetas}
        playerGroupMap={Object.fromEntries(playerGroupMap)}
        groups={rawGroups}
      />
    </PageWrapper>
  );
}
