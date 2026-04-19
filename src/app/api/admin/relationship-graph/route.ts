import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type GraphNodeType = "user" | "player";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  userId?: number;
  sessionCount: number;
  linkedUserNodeId?: string;
};

export type GraphEdgeType = "ownership" | "link" | "equivalence" | "implicit-equivalence";

export type GraphEdge = {
  source: string;
  target: string;
  type: GraphEdgeType;
  strength?: number;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphEdge[];
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, players, playerLinks, equivalences, inviteCounts, sessionCounts] =
    await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true } }),
      prisma.player.findMany({
        select: { id: true, name: true, userId: true },
      }),
      prisma.playerLink.findMany({
        where: { status: "ACCEPTED" },
        select: {
          id: true,
          ownerUserId: true,
          ownerPlayerId: true,
          linkedUserId: true,
          linkedPlayerId: true,
        },
      }),
      prisma.playerEquivalence.findMany({
        select: { fromPlayerId: true, toPlayerId: true },
      }),
      prisma.sessionInvite.groupBy({
        by: ["linkId"],
        where: { status: "ACCEPTED" },
        _count: { id: true },
      }),
      prisma.sessionPlayer.groupBy({
        by: ["playerId"],
        _count: { id: true },
      }),
    ]);

  const strengthByLinkId = new Map<number, number>(
    inviteCounts.map((c) => [c.linkId, c._count.id])
  );

  const sessionCountByPlayerId = new Map<number, number>(
    sessionCounts.map((c) => [c.playerId, c._count.id])
  );

  // Map each player to the user node it represents (via PlayerLink)
  const playerLinkedUserNode = new Map<number, string>();
  for (const link of playerLinks) {
    // ownerPlayer represents linkedUser
    playerLinkedUserNode.set(link.ownerPlayerId, `user-${link.linkedUserId}`);
    // linkedPlayer represents ownerUser
    if (link.linkedPlayerId != null) {
      playerLinkedUserNode.set(link.linkedPlayerId, `user-${link.ownerUserId}`);
    }
  }

  // Implicit equivalence: players from different users that all represent the same linkedUser
  const ownerPlayersByLinkedUser = new Map<number, number[]>();
  for (const link of playerLinks) {
    const arr = ownerPlayersByLinkedUser.get(link.linkedUserId) ?? [];
    arr.push(link.ownerPlayerId);
    ownerPlayersByLinkedUser.set(link.linkedUserId, arr);
  }
  const implicitEquivalenceLinks: GraphEdge[] = [];
  for (const ownerPlayerIds of ownerPlayersByLinkedUser.values()) {
    if (ownerPlayerIds.length < 2) continue;
    for (let i = 0; i < ownerPlayerIds.length; i++) {
      for (let j = i + 1; j < ownerPlayerIds.length; j++) {
        implicitEquivalenceLinks.push({
          source: `player-${ownerPlayerIds[i]}`,
          target: `player-${ownerPlayerIds[j]}`,
          type: "implicit-equivalence",
        });
      }
    }
  }

  const nodes: GraphNode[] = [
    ...users.map((u) => ({
      id: `user-${u.id}`,
      type: "user" as const,
      label: u.username,
      sessionCount: 0,
    })),
    ...players.map((p) => ({
      id: `player-${p.id}`,
      type: "player" as const,
      label: p.name,
      userId: p.userId,
      sessionCount: sessionCountByPlayerId.get(p.id) ?? 0,
      linkedUserNodeId: playerLinkedUserNode.get(p.id),
    })),
  ];

  const links: GraphEdge[] = [
    ...players.map((p) => ({
      source: `player-${p.id}`,
      target: `user-${p.userId}`,
      type: "ownership" as const,
    })),
    ...playerLinks.map((l) => ({
      source: `user-${l.ownerUserId}`,
      target: `user-${l.linkedUserId}`,
      type: "link" as const,
      strength: strengthByLinkId.get(l.id) ?? 0,
    })),
    ...equivalences.map((e) => ({
      source: `player-${e.fromPlayerId}`,
      target: `player-${e.toPlayerId}`,
      type: "equivalence" as const,
    })),
    ...implicitEquivalenceLinks,
  ];

  return NextResponse.json({ nodes, links } satisfies GraphData);
}
