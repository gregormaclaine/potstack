import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionsView from "@/components/sessions/SessionsView";
import type { UnifiedSession, PokerEvent } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));
  const limit = 20;

  const [total, raw, rawAccepted, rawEvents, pendingInviteCount] = await Promise.all([
    prisma.session.count({ where: { userId } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        players: {
          include: {
            player: {
              select: {
                name: true,
                group: { select: { id: true, name: true, color: true } },
              },
            },
          },
          orderBy: { player: { name: "asc" } },
        },
      },
    }),
    prisma.acceptedSession.findMany({
      where: { userId },
      orderBy: [{ session: { date: "desc" } }],
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
            sessionPlayer: {
              select: { buyIn: true, cashOut: true, profit: true },
            },
            session: { select: { buyIn: true, cashOut: true, profit: true } },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
    prisma.sessionInvite.count({
      where: { inviteeId: userId, status: "PENDING" },
    }),
  ]);

  const owned: UnifiedSession[] = raw.map((s) => ({
    id: s.id,
    sessionId: s.id,
    source: "owned",
    date: s.date.toISOString(),
    location: s.location,
    notes: s.notes,
    buyIn: s.buyIn,
    cashOut: s.cashOut,
    profit: s.profit,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    inviterUsername: null,
    players: [
      {
        playerId: null,
        playerName: "You",
        group: null,
        buyIn: s.buyIn,
        cashOut: s.cashOut,
        profit: s.profit,
        isMe: true as const,
        linkedUsername: null,
        resolvedVia: null,
      },
      ...s.players.map((sp) => ({
        playerId: sp.playerId,
        playerName: sp.player.name,
        group: sp.player.group ?? null,
        buyIn: sp.buyIn,
        cashOut: sp.cashOut,
        profit: sp.profit,
        isMe: false as const,
        linkedUsername: null,
        resolvedVia: null,
      })),
    ],
  }));

  const accepted: UnifiedSession[] = rawAccepted.map((a) => {
    const sp = a.invite.sessionPlayer;
    const src = a.invite.session;
    const myBuyIn = sp?.buyIn ?? src.buyIn;
    const myCashOut = sp?.cashOut ?? src.cashOut;
    const myProfit = sp?.profit ?? src.profit;
    return {
      id: a.id,
      sessionId: a.sessionId,
      source: "accepted",
      date: a.session.date.toISOString(),
      location: a.localLocation ?? a.session.location,
      notes: a.localNotes ?? a.session.notes,
      buyIn: myBuyIn,
      cashOut: myCashOut,
      profit: myProfit,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      inviterUsername: a.session.user.username,
      players: [
        {
          playerId: null,
          playerName: "You",
          group: null,
          buyIn: myBuyIn,
          cashOut: myCashOut,
          profit: myProfit,
          isMe: true as const,
          linkedUsername: null,
          resolvedVia: null,
        },
        ...a.session.players.map((p) => ({
          playerId: p.playerId,
          playerName: p.player.name,
          group: null,
          buyIn: p.buyIn,
          cashOut: p.cashOut,
          profit: p.profit,
          isMe: false as const,
          linkedUsername: null,
          resolvedVia: null,
        })),
      ],
    };
  });

  const events: PokerEvent[] = rawEvents.map((e) => ({
    id: e.id,
    name: e.name,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <PageWrapper>
      {pendingInviteCount > 0 && (
        <Link
          href="/notifications"
          className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 transition-colors hover:bg-emerald-950/60"
        >
          <span>
            <span className="font-semibold">
              {pendingInviteCount} session {pendingInviteCount === 1 ? "invite" : "invites"}
            </span>{" "}
            waiting for your approval
          </span>
          <span className="text-emerald-500">View →</span>
        </Link>
      )}
      <SessionsView
        sessions={[...owned, ...accepted]}
        initialEvents={events}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
      />
    </PageWrapper>
  );
}
