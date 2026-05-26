import { prisma } from '@/lib/prisma';
import { playerInclude } from '@/lib/sessionUtils';
import type { PlayerGroup, UnifiedSession, UnifiedSessionPlayer } from '@/types';

type PlayerInfo = { id: number; name: string; group: PlayerGroup | null };

type PlayerInfoWithUsername = PlayerInfo & { username: string };

function mapOwnedSession(s: {
  id: number;
  date: Date;
  location: string | null;
  notes: string | null;
  buyIn: number;
  cashOut: number;
  profit: number;
  createdAt: Date;
  updatedAt: Date;
  players: Array<{
    playerId: number;
    buyIn: number | null;
    cashOut: number | null;
    profit: number | null;
    player: { name: string; group: PlayerGroup | null };
  }>;
}): UnifiedSession {
  return {
    id: s.id,
    sessionId: s.id,
    source: 'owned',
    date: s.date.toISOString(),
    location: s.location,
    notes: s.notes,
    buyIn: s.buyIn,
    cashOut: s.cashOut,
    profit: s.profit,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    players: s.players.map(sp => ({
      playerId: sp.playerId,
      playerName: sp.player.name,
      group: sp.player.group ?? null,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
      linkedUsername: null,
      resolvedVia: null,
      isInviter: false,
    })),
  };
}

async function resolvePlayersBatch(
  otherPlayerIds: number[],
  allLinkIds: number[],
  userId: number,
): Promise<{
  linkGraphResolved: Map<number, PlayerInfoWithUsername>;
  equivalenceMap: Map<string, PlayerInfo>;
}> {
  const linkGraphResolved = new Map<number, PlayerInfoWithUsername>();
  const equivalenceMap = new Map<string, PlayerInfo>();

  if (otherPlayerIds.length === 0) return { linkGraphResolved, equivalenceMap };

  // Step A: PlayerLink graph resolution
  const [theirLinksAsOwner, theirLinksAsLinked] = await Promise.all([
    prisma.playerLink.findMany({
      where: { ownerPlayerId: { in: otherPlayerIds }, status: 'ACCEPTED' },
      select: { ownerPlayerId: true, linkedUserId: true },
    }),
    prisma.playerLink.findMany({
      where: { linkedPlayerId: { in: otherPlayerIds }, status: 'ACCEPTED' },
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
    const thirdUserIds = Array.from(new Set(playerToRealUser.values()));

    const myLinks = await prisma.playerLink.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { ownerUserId: userId, linkedUserId: { in: thirdUserIds } },
          { linkedUserId: userId, ownerUserId: { in: thirdUserIds } },
        ],
      },
      include: {
        ownerPlayer: {
          select: { id: true, name: true, group: { select: { id: true, name: true, color: true } } },
        },
        linkedPlayer: {
          select: { id: true, name: true, group: { select: { id: true, name: true, color: true } } },
        },
        ownerUser: { select: { username: true } },
        linkedUser: { select: { username: true } },
      },
    });

    const myPlayerForUser = new Map<number, PlayerInfoWithUsername>();
    for (const ml of myLinks) {
      if (ml.ownerUserId === userId) {
        myPlayerForUser.set(ml.linkedUserId, {
          ...ml.ownerPlayer,
          group: ml.ownerPlayer.group ?? null,
          username: ml.linkedUser.username,
        });
      } else if (ml.linkedPlayer !== null) {
        myPlayerForUser.set(ml.ownerUserId, {
          ...ml.linkedPlayer,
          group: ml.linkedPlayer.group ?? null,
          username: ml.ownerUser.username,
        });
      }
    }

    for (const [fromPlayerId, thirdUserId] of playerToRealUser) {
      const myPlayer = myPlayerForUser.get(thirdUserId);
      if (myPlayer) linkGraphResolved.set(fromPlayerId, myPlayer);
    }
  }

  // Step B: PlayerEquivalence resolution for remaining unresolved players
  const unresolvedIds = otherPlayerIds.filter(id => !linkGraphResolved.has(id));
  if (unresolvedIds.length > 0 && allLinkIds.length > 0) {
    const equivalences = await prisma.playerEquivalence.findMany({
      where: { fromPlayerId: { in: unresolvedIds }, linkId: { in: allLinkIds } },
      include: {
        toPlayer: {
          select: { id: true, name: true, group: { select: { id: true, name: true, color: true } } },
        },
      },
    });
    for (const eq of equivalences) {
      equivalenceMap.set(`${eq.fromPlayerId}_${eq.linkId}`, {
        id: eq.toPlayer.id,
        name: eq.toPlayer.name,
        group: eq.toPlayer.group ?? null,
      });
    }
  }

  return { linkGraphResolved, equivalenceMap };
}

type RawAccepted = {
  id: number;
  sessionId: number;
  localLocation: string | null;
  localNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  session: {
    date: Date;
    location: string | null;
    notes: string | null;
    buyIn: number;
    cashOut: number;
    profit: number;
    user: { username: string };
    players: Array<{
      playerId: number;
      buyIn: number | null;
      cashOut: number | null;
      profit: number | null;
      player: { name: string };
    }>;
  };
  invite: {
    id: number;
    sessionPlayer: { buyIn: number | null; cashOut: number | null; profit: number | null } | null;
    link: {
      id: number;
      ownerUserId: number;
      ownerPlayerId: number;
      linkedUserId: number;
      linkedPlayerId: number | null;
      ownerPlayer: { id: number; name: string; group: PlayerGroup | null };
      linkedPlayer: { id: number; name: string; group: PlayerGroup | null } | null;
    };
  };
};

function mapAcceptedSession(
  raw: RawAccepted,
  userId: number,
  linkGraphResolved: Map<number, PlayerInfoWithUsername>,
  equivalenceMap: Map<string, PlayerInfo>,
): UnifiedSession {
  const link = raw.invite.link;
  const inviteeIsOwner = userId === link.ownerUserId;
  const excludePlayerId = inviteeIsOwner ? link.linkedPlayerId : link.ownerPlayerId;
  const inviterPlayer = inviteeIsOwner ? link.ownerPlayer : link.linkedPlayer;

  const otherPlayers = raw.session.players.filter(sp => sp.playerId !== excludePlayerId);

  const inviterEntry: UnifiedSessionPlayer = {
    playerId: inviterPlayer?.id ?? null,
    playerName: inviterPlayer?.name ?? raw.session.user.username,
    group: inviterPlayer?.group ?? null,
    buyIn: raw.session.buyIn,
    cashOut: raw.session.cashOut,
    profit: raw.session.profit,
    linkedUsername: raw.session.user.username,
    resolvedVia: inviterPlayer ? 'playerLink' : null,
    isInviter: true,
  };

  const otherEntries: UnifiedSessionPlayer[] = otherPlayers.map(sp => {
    const lgMatch = linkGraphResolved.get(sp.playerId);
    if (lgMatch) {
      return {
        playerId: lgMatch.id,
        playerName: lgMatch.name,
        group: lgMatch.group,
        buyIn: sp.buyIn,
        cashOut: sp.cashOut,
        profit: sp.profit,
        linkedUsername: lgMatch.username,
        resolvedVia: 'playerLink',
        isInviter: false,
      };
    }

    const eqMatch = equivalenceMap.get(`${sp.playerId}_${link.id}`);
    if (eqMatch) {
      return {
        playerId: eqMatch.id,
        playerName: eqMatch.name,
        group: eqMatch.group,
        buyIn: sp.buyIn,
        cashOut: sp.cashOut,
        profit: sp.profit,
        linkedUsername: null,
        resolvedVia: 'equivalence',
        isInviter: false,
      };
    }

    return {
      playerId: null,
      playerName: sp.player.name,
      group: null,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
      linkedUsername: null,
      resolvedVia: null,
      isInviter: false,
    };
  });

  const sp = raw.invite.sessionPlayer;

  return {
    id: raw.id,
    sessionId: raw.sessionId,
    source: 'accepted',
    date: raw.session.date.toISOString(),
    location: raw.localLocation ?? raw.session.location,
    notes: raw.localNotes ?? raw.session.notes,
    buyIn: sp?.buyIn ?? 0,
    cashOut: sp?.cashOut ?? 0,
    profit: sp?.profit ?? 0,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    players: [inviterEntry, ...otherEntries],
  };
}

async function buildAcceptedSessions(rawAccepted: RawAccepted[], userId: number): Promise<UnifiedSession[]> {
  if (rawAccepted.length === 0) return [];

  const allOtherPlayerIds = new Set<number>();
  const allLinkIds = new Set<number>();

  for (const raw of rawAccepted) {
    const link = raw.invite.link;
    const inviteeIsOwner = userId === link.ownerUserId;
    const excludePlayerId = inviteeIsOwner ? link.linkedPlayerId : link.ownerPlayerId;

    for (const sp of raw.session.players) {
      if (sp.playerId !== excludePlayerId) allOtherPlayerIds.add(sp.playerId);
    }
    allLinkIds.add(link.id);
  }

  const { linkGraphResolved, equivalenceMap } = await resolvePlayersBatch(
    Array.from(allOtherPlayerIds),
    Array.from(allLinkIds),
    userId,
  );

  return rawAccepted.map(raw => mapAcceptedSession(raw, userId, linkGraphResolved, equivalenceMap));
}

export async function fetchAllForUser(userId: number): Promise<UnifiedSession[]> {
  const [rawSessions, rawAccepted] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: playerInclude,
    }),
    prisma.acceptedSession.findMany({
      where: { userId },
      include: {
        session: {
          select: {
            date: true,
            location: true,
            notes: true,
            buyIn: true,
            cashOut: true,
            profit: true,
            user: { select: { username: true } },
            players: {
              select: {
                playerId: true,
                buyIn: true,
                cashOut: true,
                profit: true,
                player: { select: { name: true } },
              },
            },
          },
        },
        invite: {
          select: {
            id: true,
            sessionPlayer: { select: { buyIn: true, cashOut: true, profit: true } },
            link: {
              select: {
                id: true,
                ownerUserId: true,
                ownerPlayerId: true,
                linkedUserId: true,
                linkedPlayerId: true,
                ownerPlayer: {
                  select: { id: true, name: true, group: { select: { id: true, name: true, color: true } } },
                },
                linkedPlayer: {
                  select: { id: true, name: true, group: { select: { id: true, name: true, color: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const owned = rawSessions.map(mapOwnedSession);
  const accepted = await buildAcceptedSessions(rawAccepted, userId);

  return [...owned, ...accepted].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
