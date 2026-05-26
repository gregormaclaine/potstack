import { prisma } from '@/lib/prisma';
import { resolveSessionPlayers } from '@/lib/resolveSessionPlayers';
import type { AcceptedSessionPlayer } from '@/types';

export type OwnedSessionDetail = {
  id: number;
  date: Date;
  location: string | null;
  notes: string | null;
  buyIn: number;
  cashOut: number;
  profit: number;
  createdAt: Date;
  players: Array<{
    id: number;
    playerId: number;
    buyIn: number | null;
    cashOut: number | null;
    profit: number | null;
    player: { name: string };
  }>;
  invites: Array<{ status: string }>;
};

export async function fetchOwnedSessionDetail(id: number, userId: number): Promise<OwnedSessionDetail | null> {
  return prisma.session.findUnique({
    where: { id, userId },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: 'asc' } },
      },
      invites: { select: { status: true } },
    },
  });
}

export type AcceptedSessionDetail = {
  id: number;
  sessionId: number;
  sessionPlayerId: number;
  linkId: number;
  localLocation: string | null;
  localNotes: string | null;
  myBuyIn: number;
  myCashOut: number;
  myProfit: number;
  session: {
    date: Date;
    location: string | null;
    notes: string | null;
    buyIn: number;
    cashOut: number;
    profit: number;
    user: { username: string };
  };
  link: {
    ownerUserId: number;
    ownerPlayer: { name: string } | null;
    linkedPlayer: { name: string } | null;
  };
  players: AcceptedSessionPlayer[];
};

export async function fetchAcceptedSessionDetail(
  id: number,
  userId: number,
): Promise<AcceptedSessionDetail | null> {
  const accepted = await prisma.acceptedSession.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          players: {
            include: { player: { select: { id: true, name: true } } },
            orderBy: { player: { name: 'asc' } },
          },
          user: { select: { username: true } },
        },
      },
      sessionPlayer: { select: { buyIn: true, cashOut: true, profit: true } },
      link: {
        select: {
          ownerUserId: true,
          ownerPlayer: { select: { name: true } },
          linkedPlayer: { select: { name: true } },
        },
      },
    },
  });

  if (!accepted || accepted.userId !== userId) return null;

  const { resolved } = await resolveSessionPlayers(
    accepted.linkId,
    accepted.sessionPlayerId,
    accepted.sessionId,
    userId,
  );
  const resolvedMap = new Map(resolved.map((r) => [r.fromPlayerId, r]));

  const players: AcceptedSessionPlayer[] = accepted.session.players
    .filter((sp) => sp.id !== accepted.sessionPlayerId)
    .map((sp) => {
      const match = resolvedMap.get(sp.playerId);
      return {
        fromPlayerId: sp.playerId,
        fromPlayerName: sp.player.name,
        toPlayerId: match?.toPlayerId ?? null,
        toPlayerName: match?.toPlayerName ?? null,
        buyIn: sp.buyIn,
        cashOut: sp.cashOut,
        profit: sp.profit,
        isMe: false,
        resolvedVia: match?.resolvedVia ?? null,
        linkedUsername: match?.linkedUsername ?? null,
      };
    });

  return {
    id: accepted.id,
    sessionId: accepted.sessionId,
    sessionPlayerId: accepted.sessionPlayerId,
    linkId: accepted.linkId,
    localLocation: accepted.localLocation,
    localNotes: accepted.localNotes,
    myBuyIn: accepted.sessionPlayer.buyIn ?? accepted.session.buyIn,
    myCashOut: accepted.sessionPlayer.cashOut ?? accepted.session.cashOut,
    myProfit: accepted.sessionPlayer.profit ?? accepted.session.profit,
    session: {
      date: accepted.session.date,
      location: accepted.session.location,
      notes: accepted.session.notes,
      buyIn: accepted.session.buyIn,
      cashOut: accepted.session.cashOut,
      profit: accepted.session.profit,
      user: accepted.session.user,
    },
    link: accepted.link,
    players,
  };
}
