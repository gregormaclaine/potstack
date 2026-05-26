import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionsView from "@/components/sessions/SessionsView";
import { serializeSession } from "@/lib/sessionUtils";
import type { SessionWithPlayers, AcceptedSessionRef, PokerEvent } from "@/types";

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
            user: { select: { username: true } },
            _count: { select: { players: true } },
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

  const sessions: SessionWithPlayers[] = raw.map(serializeSession);

  const acceptedSessions: AcceptedSessionRef[] = rawAccepted.map((a) => {
    const sp = a.invite.sessionPlayer;
    const src = a.invite.session;
    return {
      id: a.id,
      sessionId: a.sessionId,
      date: a.session.date.toISOString(),
      location: a.session.location,
      localLocation: a.localLocation,
      notes: a.session.notes,
      localNotes: a.localNotes,
      inviterUsername: a.session.user.username,
      myBuyIn: sp.buyIn ?? src.buyIn,
      myCashOut: sp.cashOut ?? src.cashOut,
      myProfit: sp.profit ?? src.profit,
      playerCount: a.session._count.players,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
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
        sessions={sessions}
        acceptedSessions={acceptedSessions}
        initialEvents={events}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
      />
    </PageWrapper>
  );
}
