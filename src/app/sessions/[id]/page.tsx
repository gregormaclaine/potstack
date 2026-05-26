import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { fetchOwnedSessionDetail } from "@/lib/session-detail";
import { fetchAdjacentSessions } from "@/lib/adjacent-sessions";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DeleteSessionButton from "./DeleteSessionButton";
import SharePlayerButton from "@/components/sessions/SharePlayerButton";
import SessionNav from "@/components/sessions/SessionNav";
import { formatDate } from "@/lib/formatters";
import CurrencyValue from "@/components/ui/CurrencyValue";
import { clsx } from "clsx";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const { id } = await params;

  const [session, adjacent] = await Promise.all([
    fetchOwnedSessionDetail(Number(id), userId),
    fetchAdjacentSessions(Number(id), 'owned', userId),
  ]);

  if (!session) notFound();

  // Fetch session invites and build a lookup by sessionPlayerId
  const sessionInvites = await prisma.sessionInvite.findMany({
    where: { sessionId: Number(id) },
    select: { sessionPlayerId: true, status: true },
  });
  const inviteBySessionPlayerId = new Map<number, "PENDING" | "ACCEPTED" | "REJECTED">();
  for (const inv of sessionInvites) {
    inviteBySessionPlayerId.set(inv.sessionPlayerId, inv.status as "PENDING" | "ACCEPTED" | "REJECTED");
  }

  // Find which player IDs have an accepted link with the current user (either direction)
  const sessionPlayerIds = session.players.map((sp) => sp.playerId);
  const allSessionPlayerIds = session.players.map((sp) => sp.id);

  const [ownerLinks, linkedLinks, acceptedSessionsForPlayers] = await Promise.all([
    prisma.playerLink.findMany({
      where: { ownerUserId: userId, ownerPlayerId: { in: sessionPlayerIds }, status: "ACCEPTED" },
      select: { ownerPlayerId: true },
    }),
    prisma.playerLink.findMany({
      where: { linkedUserId: userId, linkedPlayerId: { in: sessionPlayerIds }, status: "ACCEPTED" },
      select: { linkedPlayerId: true },
    }),
    prisma.acceptedSession.findMany({
      where: { sessionPlayerId: { in: allSessionPlayerIds } },
      select: { sessionPlayerId: true },
    }),
  ]);
  const linkedPlayerIds = new Set<number>([
    ...ownerLinks.map((l) => l.ownerPlayerId),
    ...linkedLinks.flatMap((l) => (l.linkedPlayerId != null ? [l.linkedPlayerId] : [])),
  ]);
  const acceptedSessionPlayerIds = new Set<number>(
    acceptedSessionsForPlayers.map((a) => a.sessionPlayerId)
  );

  const totalInvites = inviteBySessionPlayerId.size;
  const acceptedInvites = [...inviteBySessionPlayerId.keys()].filter(
    (spId) => acceptedSessionPlayerIds.has(spId)
  ).length;

  const playersWithResults = session.players.filter(
    (sp) => sp.buyIn !== null && sp.cashOut !== null
  );
  const playersPresenceOnly = session.players.filter(
    (sp) => sp.buyIn === null
  );

  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {formatDate(session.date)}
          </h1>
          {session.location && (
            <p className="mt-1 text-sm text-zinc-400">{session.location}</p>
          )}
          <p className="mt-1 text-xs text-zinc-600">
            Recorded {formatDate(session.createdAt, "d MMM yyyy 'at' HH:mm")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/sessions/${id}/edit`}>
            <Button variant="secondary" size="sm">Edit</Button>
          </Link>
          <DeleteSessionButton sessionId={session.id} />
        </div>
      </div>


      {session.notes && (
        <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {session.notes}
        </p>
      )}

      {/* My results */}
      <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Your Results
        </h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-zinc-500">Buy-in</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={session.buyIn} /></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cash-out</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={session.cashOut} /></p>
          </div>
          <div className="ml-auto">
            <p className="text-xs text-zinc-500 text-right">Profit</p>
            <p
              className={clsx(
                "text-2xl font-bold tabular-nums",
                session.profit > 0 && "text-emerald-400",
                session.profit < 0 && "text-red-400",
                session.profit === 0 && "text-zinc-400"
              )}
            >
              <CurrencyValue value={session.profit} sign />
            </p>
          </div>
        </div>
      </div>

      {/* Sent invite acceptance indicator */}
      {totalInvites > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm">
          <span className="text-zinc-500">Sent sessions accepted:</span>
          <span className={clsx("font-semibold tabular-nums", acceptedInvites === totalInvites ? "text-emerald-400" : "text-zinc-300")}>
            {acceptedInvites}/{totalInvites}
          </span>
        </div>
      )}

      {/* Players with tracked results */}
      {playersWithResults.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">
            Player Results
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Player</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Buy-in</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Cash-out</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {playersWithResults.map((sp) => {
                  const isLinked = linkedPlayerIds.has(sp.playerId);
                  const inviteStatus = inviteBySessionPlayerId.get(sp.id);
                  const hasAcceptedSession = acceptedSessionPlayerIds.has(sp.id);

                  // Priority: 1=unlinked, 2=pending invite, 3=has accepted session, 4=no invite, 5=prev accepted/rejected
                  const showPending = isLinked && inviteStatus === "PENDING";
                  const showAcceptedSession = isLinked && !showPending && hasAcceptedSession;
                  const showShareButton = isLinked && !showPending && !hasAcceptedSession;
                  const reshare = showShareButton && (inviteStatus === "ACCEPTED" || inviteStatus === "REJECTED");

                  return (
                    <tr key={sp.id} className="bg-zinc-950">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">{sp.player.name}</span>
                          {showAcceptedSession && (
                            <span title="Has an active copy of this session" className="inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950 p-1 text-emerald-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          )}
                          {showPending && (
                            <span title="Invite sent — waiting for them to accept" className="inline-flex items-center rounded-full border border-amber-700 bg-amber-950 p-1 text-amber-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </span>
                          )}
                          {reshare && inviteStatus === "ACCEPTED" && (
                            <span title="Previously accepted but no longer has this session" className="inline-flex items-center rounded-full border border-zinc-600 bg-zinc-800 p-1 text-zinc-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          )}
                          {reshare && inviteStatus === "REJECTED" && (
                            <span title="Previously declined this invite" className="inline-flex items-center rounded-full border border-red-800 bg-red-950 p-1 text-red-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </span>
                          )}
                          {showShareButton && (
                            <SharePlayerButton
                              sessionId={session.id}
                              sessionPlayerId={sp.id}
                              reshare={reshare}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={sp.buyIn!} /></td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400"><CurrencyValue value={sp.cashOut!} /></td>
                      <td className="px-4 py-3 text-right"><Badge value={sp.profit!} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Players present only (no results) */}
      {playersPresenceOnly.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">
            Also Played
          </h2>
          <div className="flex flex-wrap gap-2">
            {playersPresenceOnly.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 py-1 pl-3 pr-2 text-sm text-zinc-300"
              >
                <span>{sp.player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {session.players.length === 0 && (
        <p className="mb-6 text-sm text-zinc-600">No players recorded for this session.</p>
      )}

      <div className="mt-4 flex justify-start">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">← Back to Sessions</Button>
        </Link>
      </div>
      <SessionNav prev={adjacent.prev} next={adjacent.next} />
    </PageWrapper>
  );
}
