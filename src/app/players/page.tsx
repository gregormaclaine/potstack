import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import PlayerList from "@/components/players/PlayerList";
import type { PlayerWithStats } from "@/types";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const raw = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: { select: { profit: true } },
    },
  });

  const players: PlayerWithStats[] = raw.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    sessionCount: p.sessions.length,
    totalProfit: p.sessions.reduce((sum, s) => sum + s.profit, 0),
  }));

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Players</h1>
        <p className="text-sm text-zinc-500">{players.length} player{players.length !== 1 ? "s" : ""}</p>
      </div>
      <PlayerList initialPlayers={players} />
    </PageWrapper>
  );
}
