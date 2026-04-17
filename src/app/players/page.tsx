import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import PlayerList from "@/components/players/PlayerList";
import { getPlayersPageData } from "@/lib/cache/players";
import type { PlayerWithStats, PlayerGroup, PlayerLinkSummary, LinkStatus } from "@/types";

export default async function PlayersPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [rawPlayers, rawGroups, rawSentLinks, rawReceivedLinks] = await getPlayersPageData(userId);

  const players: PlayerWithStats[] = rawPlayers
    .map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
      groupId: p.groupId,
      group: p.group,
      sessionCount: p.sessions.length,
      totalProfit: p.sessions.reduce((sum, s) => sum + (s.profit ?? 0), 0),
      avgSessionProfit:
        p.sessions.length > 0
          ? p.sessions.reduce((sum, s) => sum + s.session.profit, 0) / p.sessions.length
          : 0,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const groups: PlayerGroup[] = rawGroups;

  const initialLinks = new Map<number, PlayerLinkSummary>();
  for (const l of rawSentLinks) {
    initialLinks.set(l.ownerPlayerId, { id: l.id, status: l.status as LinkStatus, linkedUsername: l.linkedUser.username, playerId: l.ownerPlayerId });
  }
  // Received accepted links: only add if not already covered by a sent link for the same player
  for (const l of rawReceivedLinks) {
    if (l.linkedPlayerId !== null && !initialLinks.has(l.linkedPlayerId)) {
      initialLinks.set(l.linkedPlayerId, { id: l.id, status: "ACCEPTED", linkedUsername: l.ownerUser.username, playerId: l.linkedPlayerId });
    }
  }

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
