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
 * For a given session invite, resolve all session players (excluding the player
 * that represents the invitee in the session creator's account) into:
 *  - resolved: players automatically matched to the invitee's own player records
 *  - unresolved: players that need manual mapping
 *
 * Works for both link directions:
 *  - Original: ownerUser created session, linkedUser is invitee → exclude ownerPlayerId
 *  - Reversed: linkedUser created session, ownerUser is invitee → exclude linkedPlayerId
 *
 * Resolution order:
 *  1. PlayerLink graph — if the session creator's player is linked to user X, and the
 *     invitee also has an accepted link with user X, use the invitee's player for X
 *  2. PlayerEquivalence keyed by (fromPlayerId, linkId) — remembered manual mappings
 */
export async function resolveSessionPlayers(
  inviteId: number,
  inviteeUserId: number
): Promise<ResolutionResult> {
  const invite = await prisma.sessionInvite.findUnique({
    where: { id: inviteId },
    include: {
      link: { select: { id: true, ownerPlayerId: true, linkedPlayerId: true, ownerUserId: true, linkedUserId: true } },
      session: {
        include: {
          players: {
            include: { player: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!invite) return { resolved: [], unresolved: [] };

  const linkId = invite.link.id as number;

  // Determine which player in the session represents the invitee (to exclude from resolution).
  // Original direction: ownerUser invited linkedUser → invitee's player = ownerPlayerId
  // Reversed direction: linkedUser invited ownerUser → invitee's player = linkedPlayerId
  const inviteeIsOwner = inviteeUserId === (invite.link.ownerUserId as number);
  const excludePlayerId = inviteeIsOwner
    ? (invite.link.linkedPlayerId as number | null)
    : (invite.link.ownerPlayerId as number);

  // All session players except the one representing the invitee
  const otherPlayers = invite.session.players.filter(
    (sp) => sp.playerId !== excludePlayerId
  );

  if (otherPlayers.length === 0) return { resolved: [], unresolved: [] };

  const otherPlayerIds = otherPlayers.map((sp) => sp.playerId);

  // 1. Try the PlayerLink graph for all session players.
  //    A player in the session may be linked to a real user account. If the invitee
  //    also has an accepted link with that user, we can auto-resolve.
  const linkGraphResolved = new Map<number, { id: number; name: string; username: string }>();

  {
    // A creator's player may be linked to a real user in either direction:
    //   Direction A: creator is ownerUser — their player is ownerPlayerId, real user is linkedUserId
    //   Direction B: creator is linkedUser — their player is linkedPlayerId, real user is ownerUserId
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

    // Build a unified map: playerIdInCreatorsSession → real userId it belongs to
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

      // Find invitee's links (in either direction) with those users
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

      // Build a map: otherUserId → invitee's player + the other user's username
      const myPlayerForUser = new Map<number, { id: number; name: string; username: string }>();
      for (const ml of myLinks) {
        if (ml.ownerUserId === inviteeUserId) {
          // I sent the link → my player is ownerPlayer, other user is linkedUserId
          myPlayerForUser.set(ml.linkedUserId, { ...ml.ownerPlayer, username: ml.linkedUser.username });
        } else {
          // I received the link → my player is linkedPlayer, other user is ownerUserId
          if (ml.linkedPlayer) {
            myPlayerForUser.set(ml.ownerUserId, { ...ml.linkedPlayer, username: ml.ownerUser.username });
          }
        }
      }

      // Map back: fromPlayerId → invitee's player + linked username (via the real user)
      for (const [playerId, realUserId] of playerToRealUser) {
        const myPlayer = myPlayerForUser.get(realUserId);
        if (myPlayer) {
          linkGraphResolved.set(playerId, myPlayer);
        }
      }
    }
  }

  // 2. For players not resolved via link graph, check PlayerEquivalence (remembered manual mappings).
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
