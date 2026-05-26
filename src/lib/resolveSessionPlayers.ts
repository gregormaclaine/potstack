import { prisma } from "@/lib/prisma";

export interface ResolvedPlayer {
  fromPlayerId: number;
  fromPlayerName: string;
  toPlayerId: number;
  toPlayerName: string;
  resolvedVia: "playerLink" | "equivalence";
  linkedUsername: string | null;
}

export interface UnresolvedPlayer {
  fromPlayerId: number;
  fromPlayerName: string;
}

export interface ResolutionResult {
  resolved: ResolvedPlayer[];
  unresolved: UnresolvedPlayer[];
}

/**
 * Resolves all session players (excluding the invitee's own session player) into
 * resolved (auto-matched) and unresolved (needs manual mapping) lists.
 *
 * Resolution order:
 *  1. PlayerLink graph — if a session player is linked to a real user and the invitee
 *     also has an accepted link with that user, auto-resolve to the invitee's player.
 *  2. PlayerEquivalence keyed by (fromPlayerId, linkId) — remembered manual mappings.
 */
export async function resolveSessionPlayers(
  linkId: number,
  sessionPlayerId: number,
  sessionId: number,
  inviteeUserId: number,
): Promise<ResolutionResult> {
  const [link, sessionPlayers] = await Promise.all([
    prisma.playerLink.findUnique({
      where: { id: linkId },
      select: { id: true, ownerPlayerId: true, linkedPlayerId: true, ownerUserId: true, linkedUserId: true },
    }),
    prisma.sessionPlayer.findMany({
      where: { sessionId },
      include: { player: { select: { id: true, name: true } } },
    }),
  ]);

  if (!link) return { resolved: [], unresolved: [] };

  const otherPlayers = sessionPlayers.filter(sp => sp.id !== sessionPlayerId);

  if (otherPlayers.length === 0) return { resolved: [], unresolved: [] };

  const otherPlayerIds = otherPlayers.map((sp) => sp.playerId);

  // 1. Try the PlayerLink graph for all session players.
  const linkGraphResolved = new Map<number, { id: number; name: string; username: string }>();

  {
    const [theirLinksAsOwner, theirLinksAsLinked] = await Promise.all([
      prisma.playerLink.findMany({
        where: { ownerPlayerId: { in: otherPlayerIds }, status: "ACCEPTED" },
        select: { ownerPlayerId: true, linkedUserId: true },
      }),
      prisma.playerLink.findMany({
        where: { linkedPlayerId: { in: otherPlayerIds }, status: "ACCEPTED" },
        select: { linkedPlayerId: true, ownerUserId: true },
      }),
    ]);

    const playerToRealUser = new Map<number, number>();
    for (const tl of theirLinksAsOwner) {
      playerToRealUser.set(tl.ownerPlayerId, tl.linkedUserId);
    }
    for (const tl of theirLinksAsLinked) {
      if (tl.linkedPlayerId !== null) {
        playerToRealUser.set(tl.linkedPlayerId, tl.ownerUserId);
      }
    }

    if (playerToRealUser.size > 0) {
      const theirUserIds = Array.from(new Set(playerToRealUser.values()));

      const myLinks = await prisma.playerLink.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { ownerUserId: inviteeUserId, linkedUserId: { in: theirUserIds } },
            { linkedUserId: inviteeUserId, ownerUserId: { in: theirUserIds } },
          ],
        },
        include: {
          ownerPlayer: { select: { id: true, name: true } },
          linkedPlayer: { select: { id: true, name: true } },
          ownerUser: { select: { username: true } },
          linkedUser: { select: { username: true } },
        },
      });

      const myPlayerForUser = new Map<number, { id: number; name: string; username: string }>();
      for (const ml of myLinks) {
        if (ml.ownerUserId === inviteeUserId) {
          myPlayerForUser.set(ml.linkedUserId, { ...ml.ownerPlayer, username: ml.linkedUser.username });
        } else {
          if (ml.linkedPlayer) {
            myPlayerForUser.set(ml.ownerUserId, { ...ml.linkedPlayer, username: ml.ownerUser.username });
          }
        }
      }

      for (const [playerId, realUserId] of playerToRealUser) {
        const myPlayer = myPlayerForUser.get(realUserId);
        if (myPlayer) {
          linkGraphResolved.set(playerId, myPlayer);
        }
      }
    }
  }

  // 2. For players not resolved via link graph, check PlayerEquivalence.
  const linkGraphUnresolved = otherPlayerIds.filter((id) => !linkGraphResolved.has(id));
  const equivalenceMap = new Map<number, { id: number; name: string }>();

  if (linkGraphUnresolved.length > 0) {
    const equivalences = await prisma.playerEquivalence.findMany({
      where: { fromPlayerId: { in: linkGraphUnresolved }, linkId },
      include: { toPlayer: { select: { id: true, name: true } } },
    });
    for (const eq of equivalences) {
      equivalenceMap.set(eq.fromPlayerId, eq.toPlayer);
    }
  }

  const resolved: ResolvedPlayer[] = [];
  const unresolved: UnresolvedPlayer[] = [];

  for (const sp of otherPlayers) {
    const fromPlayerId = sp.playerId as number;
    const fromPlayerName = sp.player.name as string;

    const lgMatch = linkGraphResolved.get(fromPlayerId);
    if (lgMatch) {
      resolved.push({ fromPlayerId, fromPlayerName, toPlayerId: lgMatch.id, toPlayerName: lgMatch.name, resolvedVia: "playerLink", linkedUsername: lgMatch.username });
      continue;
    }

    const eqMatch = equivalenceMap.get(fromPlayerId);
    if (eqMatch) {
      resolved.push({ fromPlayerId, fromPlayerName, toPlayerId: eqMatch.id, toPlayerName: eqMatch.name, resolvedVia: "equivalence", linkedUsername: null });
      continue;
    }

    unresolved.push({ fromPlayerId, fromPlayerName });
  }

  return { resolved, unresolved };
}
