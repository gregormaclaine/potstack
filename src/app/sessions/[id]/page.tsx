import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DeleteSessionButton from "./DeleteSessionButton";
import SharePlayerButton from "@/components/sessions/SharePlayerButton";
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

  const session = await prisma.session.findUnique({
    where: { id: Number(id), userId },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: "asc" } },
      },
      invites: { select: { status: true } },
    },
  });

  if (!session) notFound();

  // Determine the inviter's playerId in this session (to suppress share button)
  let inviterPlayerId: number | null = null;
  let inviterUsername: string | null = null;
  if (session.sourceInviteId) {
    const sourceInvite = await prisma.sessionInvite.findUnique({
      where: { id: session.sourceInviteId },
      select: {
        link: { select: { ownerUserId: true, ownerPlayerId: true, linkedPlayerId: true } },
        session: { select: { user: { select: { username: true } } } },
      },
    });
    if (sourceInvite) {
      inviterUsername = sourceInvite.session.user.username;
      const inviteeIsOwner = userId === sourceInvite.link.ownerUserId;
      inviterPlayerId = inviteeIsOwner ? sourceInvite.link.ownerPlayerId : (sourceInvite.link.linkedPlayerId ?? null);
    }
  }

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
  const [ownerLinks, linkedLinks] = await Promise.all([
    prisma.playerLink.findMany({
      where: { ownerUserId: userId, ownerPlayerId: { in: sessionPlayerIds }, status: "ACCEPTED" },
      select: { ownerPlayerId: true },
    }),
    prisma.playerLink.findMany({
      where: { linkedUserId: userId, linkedPlayerId: { in: sessionPlayerIds }, status: "ACCEPTED" },
      select: { linkedPlayerId: true },
    }),
  ]);
  const linkedPlayerIds = new Set<number>([
    ...ownerLinks.map((l) => l.ownerPlayerId),
    ...linkedLinks.flatMap((l) => (l.linkedPlayerId != null ? [l.linkedPlayerId] : [])),
  ]);

  const totalInvites = session.invites.length;
  const acceptedInvites = session.invites.filter((i) => i.status === "ACCEPTED").length;

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

      {inviterUsername && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-900 bg-blue-950/40 px-4 py-2.5 text-sm text-blue-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 19-7z" />
          </svg>
          <span>Shared by <span className="font-semibold">@{inviterUsername}</span></span>
        </div>
      )}

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
                  const isInviter = sp.playerId === inviterPlayerId;
                  return (
                    <tr key={sp.id} className="bg-zinc-950">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">{sp.player.name}</span>
                          {!isInviter && (isLinked || inviteStatus) && (
                            <SharePlayerButton
                              sessionId={session.id}
                              sessionPlayerId={sp.id}
                              initialStatus={inviteStatus ?? null}
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
    </PageWrapper>
  );
}
