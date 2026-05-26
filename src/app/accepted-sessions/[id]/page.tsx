import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import CurrencyValue from "@/components/ui/CurrencyValue";
import { formatDate } from "@/lib/formatters";
import { clsx } from "clsx";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import AcceptedSessionPlayerList from "@/components/accepted-sessions/AcceptedSessionPlayerList";
import AcceptedSessionActions from "./AcceptedSessionActions";
import type { AcceptedSessionPlayer } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AcceptedSessionPage({ params }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);
  const { id } = await params;

  const accepted = await prisma.acceptedSession.findUnique({
    where: { id: Number(id) },
    include: {
      session: {
        include: {
          players: {
            include: { player: { select: { id: true, name: true } } },
            orderBy: { player: { name: "asc" } },
          },
          user: { select: { username: true } },
        },
      },
      invite: {
        select: {
          id: true,
          sessionPlayerId: true,
          link: {
            select: {
              ownerUserId: true,
              ownerPlayer: { select: { name: true } },
              linkedPlayer: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!accepted || accepted.userId !== userId) notFound();

  const [{ resolved }, myPlayers] = await Promise.all([
    resolveSessionPlayers(accepted.invite.id, userId),
    prisma.player.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const resolvedMap = new Map(resolved.map((r) => [r.fromPlayerId, r]));

  const mySessionPlayer = accepted.session.players.find(
    (sp) => sp.id === accepted.invite.sessionPlayerId
  );
  const myBuyIn   = mySessionPlayer?.buyIn   ?? accepted.session.buyIn;
  const myCashOut = mySessionPlayer?.cashOut ?? accepted.session.cashOut;
  const myProfit  = mySessionPlayer?.profit  ?? accepted.session.profit;

  const players: AcceptedSessionPlayer[] = accepted.session.players
    .filter((sp) => sp.id !== accepted.invite.sessionPlayerId)
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

  // Determine the invitee's own player name for the session creator via the PlayerLink.
  // If the invitee owns the link they sent it, so ownerPlayer is their player for the creator.
  // If the invitee received it, linkedPlayer is their player for the creator.
  const inviteLink = accepted.invite.link;
  const inviteeIsLinkOwner = userId === inviteLink.ownerUserId;
  const creatorPlayerName = inviteeIsLinkOwner
    ? (inviteLink.ownerPlayer?.name ?? null)
    : (inviteLink.linkedPlayer?.name ?? null);

  const creator = {
    username: accepted.session.user.username,
    playerName: creatorPlayerName,
    buyIn: accepted.session.buyIn,
    cashOut: accepted.session.cashOut,
    profit: accepted.session.profit,
  };

  const displayLocation = accepted.localLocation ?? accepted.session.location;

  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {formatDate(accepted.session.date)}
          </h1>
          {displayLocation && (
            <p className="mt-1 text-sm text-zinc-400">{displayLocation}</p>
          )}
          <p className="mt-1 text-xs text-zinc-600">
            Recorded {formatDate(accepted.session.date, "d MMM yyyy")}
          </p>
        </div>
        <AcceptedSessionActions
          acceptedSessionId={accepted.id}
          initialLocalLocation={accepted.localLocation}
          originalLocation={accepted.session.location}
          initialLocalNotes={accepted.localNotes}
          originalNotes={accepted.session.notes}
        />
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-900 bg-blue-950/40 px-4 py-2.5 text-sm text-blue-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 19-7z" />
        </svg>
        <span>Shared by <span className="font-semibold">@{accepted.session.user.username}</span></span>
      </div>

      {(accepted.localNotes ?? accepted.session.notes) && (
        <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {accepted.localNotes ?? accepted.session.notes}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Your Results
        </h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-zinc-500">Buy-in</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={myBuyIn} /></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cash-out</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={myCashOut} /></p>
          </div>
          <div className="ml-auto">
            <p className="text-xs text-zinc-500 text-right">Profit</p>
            <p className={clsx(
              "text-2xl font-bold tabular-nums",
              myProfit > 0 && "text-emerald-400",
              myProfit < 0 && "text-red-400",
              myProfit === 0 && "text-zinc-400"
            )}>
              <CurrencyValue value={myProfit} sign />
            </p>
          </div>
        </div>
      </div>

      <AcceptedSessionPlayerList
        acceptedSessionId={accepted.id}
        initialPlayers={players}
        myPlayers={myPlayers}
        creator={creator}
      />

      <div className="mt-4 flex justify-start">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">← Back to Sessions</Button>
        </Link>
      </div>
    </PageWrapper>
  );
}
