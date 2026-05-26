import { prisma } from '@/lib/prisma';
import { playerInclude } from '@/lib/sessionUtils';
import { resolveSessionPlayers } from '@/lib/resolveSessionPlayers';
import type { UnifiedSession, UnifiedSessionPlayer } from '@/types';

type AcceptedSessionRaw = {
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
    user: { id: number; username: string };
    players: Array<{
      playerId: number;
      buyIn: number | null;
      cashOut: number | null;
      profit: number | null;
    }>;
  };
  invite: {
    id: number;
    sessionPlayer: { buyIn: number | null; cashOut: number | null; profit: number | null } | null;
  };
};

export async function fromAccepted(raw: AcceptedSessionRaw, userId: number): Promise<UnifiedSession> {
  const { resolved } = await resolveSessionPlayers(raw.invite.id, userId);

  const sessionPlayerMap = new Map(raw.session.players.map(sp => [sp.playerId, sp]));

  const inviterPlayerSearch = await prisma.playerLink.findFirst({
    where: {
      OR: [
        { ownerUserId: raw.session.user.id, linkedPlayerId: userId, status: 'ACCEPTED' },
        { ownerPlayerId: userId, linkedUserId: raw.session.user.id, status: 'ACCEPTED' },
      ],
    },
    select: {
      ownerUserId: true,
      linkedUserId: true,
      ownerPlayer: { select: { id: true, name: true } },
      linkedPlayer: { select: { id: true, name: true } },
    },
  });

  if (!inviterPlayerSearch) {
    throw new Error('Could not find accepted player link between inviter and invitee');
  }

  const inviterPlayer =
    inviterPlayerSearch.ownerPlayer.id === userId
      ? inviterPlayerSearch.linkedPlayer
      : inviterPlayerSearch.ownerPlayer;

  const players: UnifiedSessionPlayer[] = [
    {
      playerId: inviterPlayer.id,
      playerName: inviterPlayer.name,
      group: null,
      buyIn: raw.session.buyIn,
      cashOut: raw.session.cashOut,
      profit: raw.session.profit,
      linkedUsername: raw.session.user.username,
      resolvedVia: 'playerLink',
      isInviter: true,
    },
    ...resolved.map(r => {
      const sessionPlayer = sessionPlayerMap.get(r.fromPlayerId);
      return {
        playerId: r.toPlayerId,
        playerName: r.toPlayerName,
        group: null,
        buyIn: sessionPlayer?.buyIn ?? null,
        cashOut: sessionPlayer?.cashOut ?? null,
        profit: sessionPlayer?.profit ?? null,
        linkedUsername: r.linkedUsername,
        resolvedVia: r.resolvedVia,
        isInviter: false,
      };
    }),
  ];

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
    players,
  };
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
              select: { playerId: true, buyIn: true, cashOut: true, profit: true },
            },
          },
        },
        invite: {
          select: {
            id: true,
            sessionPlayer: { select: { buyIn: true, cashOut: true, profit: true } },
          },
        },
      },
    }),
  ]);

  const owned: UnifiedSession[] = rawSessions.map(s => ({
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
  }));

  const accepted = await Promise.all(rawAccepted.map(a => fromAccepted(a, userId)));

  return [...owned, ...accepted].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
