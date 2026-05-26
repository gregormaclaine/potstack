import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import PlayerList from "@/components/players/PlayerList";
import { getPlayersWithStats } from "@/lib/getPlayersWithStats";
import type { PlayerGroup } from "@/types";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [{ players, initialLinks }, rawGroups] = await Promise.all([
    getPlayersWithStats(userId),
    prisma.playerGroup.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const groups: PlayerGroup[] = rawGroups;

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Players</h1>
        <p className="text-sm text-zinc-500">{players.length} player{players.length !== 1 ? "s" : ""}</p>
      </div>
      <PlayerList initialPlayers={players} initialGroups={groups} initialLinks={initialLinks} />
    </PageWrapper>
  );
}
