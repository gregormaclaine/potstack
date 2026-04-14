import { prisma } from "@/lib/prisma";
import type { ResolvedPlayer, UnresolvedPlayer } from "@/types";

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
 *  1. PlayerEquivalence keyed by (fromPlayerId, linkId) — remembered manual mappings
 *  2. PlayerLink graph — if the session creator's player is linked to user X, and the
 *     invitee also has an accepted link with user X, use the invitee's player for X
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

  // 1. Fetch existing PlayerEquivalences for these players under this link
  const equivalences = await prisma.playerEquivalence.findMany({
    where: { fromPlayerId: { in: otherPlayerIds }, linkId },
    include: { toPlayer: { select: { id: true, name: true } } },
  });
  const equivalenceMap = new Map<number, { id: number; name: string }>(
    equivalences.map((e) => [e.fromPlayerId, e.toPlayer])
  );

  // 2. For players without an equivalence, try the PlayerLink graph.
  //    A player in the session may be linked to a real user account. If the invitee
  //    also has an accepted link with that user, we can auto-resolve.
  const unequivalenced = otherPlayerIds.filter((id) => !equivalenceMap.has(id));

  const linkGraphResolved = new Map<number, { id: number; name: string }>();

  if (unequivalenced.length > 0) {
    // Find links where the session creator's players are the ownerPlayer
    // (i.e. the session creator linked those players to real user accounts)
    const theirLinks = await prisma.playerLink.findMany({
      where: { ownerPlayerId: { in: unequivalenced }, status: "ACCEPTED" },
      select: { ownerPlayerId: true, linkedUserId: true },
    });

    if (theirLinks.length > 0) {
      const theirUserIds = theirLinks.map((l) => l.linkedUserId);

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
        },
      });

      // Build a map: otherUserId → invitee's player for that user
      const myPlayerForUser = new Map<number, { id: number; name: string }>();
      for (const ml of myLinks) {
        if (ml.ownerUserId === inviteeUserId) {
          // I sent the link → my player is ownerPlayer, other user is linkedUserId
          myPlayerForUser.set(ml.linkedUserId, ml.ownerPlayer);
        } else {
          // I received the link → my player is linkedPlayer, other user is ownerUserId
          if (ml.linkedPlayer) {
            myPlayerForUser.set(ml.ownerUserId, ml.linkedPlayer);
          }
        }
      }

      // Map back: fromPlayerId → invitee's player (via the other user)
      for (const tl of theirLinks) {
        const myPlayer = myPlayerForUser.get(tl.linkedUserId);
        if (myPlayer) {
          linkGraphResolved.set(tl.ownerPlayerId, myPlayer);
        }
      }
    }
  }

  const resolved: ResolvedPlayer[] = [];
  const unresolved: UnresolvedPlayer[] = [];

  for (const sp of otherPlayers) {
    const fromPlayerId = sp.playerId as number;
    const fromPlayerName = sp.player.name as string;

    const eqMatch = equivalenceMap.get(fromPlayerId);
    if (eqMatch) {
      resolved.push({ fromPlayerId, fromPlayerName, toPlayerId: eqMatch.id, toPlayerName: eqMatch.name });
      continue;
    }

    const lgMatch = linkGraphResolved.get(fromPlayerId);
    if (lgMatch) {
      resolved.push({ fromPlayerId, fromPlayerName, toPlayerId: lgMatch.id, toPlayerName: lgMatch.name });
      continue;
    }

    unresolved.push({ fromPlayerId, fromPlayerName });
  }

  return { resolved, unresolved };
}
