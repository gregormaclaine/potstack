import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";
import type { SessionWithPlayers } from "@/types";

export type SessionRow = {
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
    id: number;
    playerId: number;
    buyIn: number | null;
    cashOut: number | null;
    profit: number | null;
    player: { name: string; group?: { id: number; name: string; color: string } | null };
  }>;
};

export function serializeSession(session: SessionRow): SessionWithPlayers {
  return {
    id: session.id,
    date: session.date.toISOString(),
    location: session.location,
    notes: session.notes,
    buyIn: session.buyIn,
    cashOut: session.cashOut,
    profit: session.profit,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    players: session.players.map((sp) => ({
      id: sp.id,
      playerId: sp.playerId,
      playerName: sp.player.name,
      group: sp.player.group,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
    })),
  };
}

export const playerInclude = {
  players: {
    include: { player: { select: { name: true, group: { select: { id: true, name: true, color: true } } } } },
    orderBy: { player: { name: "asc" as const } },
  },
} as const;

/**
 * Creates SessionInvite rows for all accepted PlayerLinks that involve
 * any of the given players, and fires a session_invite_received notification
 * for each invitee. Handles both link directions (owner/linked).
 *
 * @param pendingLinkPlayerIds - Player IDs whose PENDING links should also
 *   receive invites (for links just created during the session form).
 */
export async function generateSessionInvites(
  sessionId: number,
  userId: number,
  playerIds: number[],
  sessionPlayers: Array<{ id: number; playerId: number }>,
  pendingLinkPlayerIds: number[] = []
): Promise<void> {
  if (playerIds.length === 0) return;

  // Owner links: ACCEPTED for all players, plus PENDING for newly-linked players
  const ownerLinkFilter = pendingLinkPlayerIds.length > 0
    ? {
        ownerUserId: userId,
        ownerPlayerId: { in: playerIds },
        OR: [
          { status: "ACCEPTED" },
          { status: "PENDING", ownerPlayerId: { in: pendingLinkPlayerIds } },
        ],
      }
    : { ownerUserId: userId, ownerPlayerId: { in: playerIds }, status: "ACCEPTED" };

  const [ownerLinks, linkedLinks, session] = await Promise.all([
    prisma.playerLink.findMany({ where: ownerLinkFilter }),
    prisma.playerLink.findMany({
      where: { linkedUserId: userId, linkedPlayerId: { in: playerIds }, status: "ACCEPTED" },
    }),
    prisma.session.findUnique({
      where: { id: sessionId },
      select: { date: true, location: true, user: { select: { username: true } } },
    }),
  ]);

  if (!session) return;

  const inviteData: Array<{ sessionId: number; sessionPlayerId: number; linkId: number; inviteeId: number }> = [];

  for (const link of ownerLinks) {
    const sp = sessionPlayers.find((s) => s.playerId === link.ownerPlayerId);
    if (sp) inviteData.push({ sessionId, sessionPlayerId: sp.id, linkId: link.id, inviteeId: link.linkedUserId });
  }
  for (const link of linkedLinks) {
    const sp = sessionPlayers.find((s) => s.playerId === link.linkedPlayerId);
    if (sp) inviteData.push({ sessionId, sessionPlayerId: sp.id, linkId: link.id, inviteeId: link.ownerUserId });
  }

  if (inviteData.length === 0) return;

  // createMany doesn't return ids, so insert one-by-one to get ids for notifications.
  const createdInvites = await Promise.all(
    inviteData.map((d) =>
      prisma.sessionInvite.upsert({
        where: { sessionId_linkId: { sessionId: d.sessionId, linkId: d.linkId } },
        update: {},
        create: d,
        include: { sessionPlayer: { select: { buyIn: true, cashOut: true, profit: true } } },
      })
    )
  );

  await Promise.all(
    createdInvites.map((invite: (typeof createdInvites)[number]) =>
      createNotification({
        userId: invite.inviteeId,
        inviteId: invite.id,
        sessionId,
        data: {
          type: "session_invite_received",
          inviterUsername: session.user.username,
          sessionDate: session.date.toISOString(),
          sessionLocation: session.location,
          buyIn: invite.sessionPlayer.buyIn,
          cashOut: invite.sessionPlayer.cashOut,
          profit: invite.sessionPlayer.profit,
        },
      })
    )
  );
}
