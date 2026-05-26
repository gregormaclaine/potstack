import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import CurrencyValue from "@/components/ui/CurrencyValue";
import { formatDate } from "@/lib/formatters";
import { clsx } from "clsx";
import { fetchAcceptedSessionDetail } from "@/lib/session-detail";
import AcceptedSessionPlayerList from "@/components/accepted-sessions/AcceptedSessionPlayerList";
import AcceptedSessionActions from "./AcceptedSessionActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AcceptedSessionPage({ params }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);
  const { id } = await params;

  const [detail, myPlayers] = await Promise.all([
    fetchAcceptedSessionDetail(Number(id), userId),
    prisma.player.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!detail) notFound();

  const inviteeIsLinkOwner = userId === detail.link.ownerUserId;
  const creatorPlayerName = inviteeIsLinkOwner
    ? (detail.link.ownerPlayer?.name ?? null)
    : (detail.link.linkedPlayer?.name ?? null);

  const creator = {
    username: detail.session.user.username,
    playerName: creatorPlayerName,
    buyIn: detail.session.buyIn,
    cashOut: detail.session.cashOut,
    profit: detail.session.profit,
  };

  const displayLocation = detail.localLocation ?? detail.session.location;

  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {formatDate(detail.session.date)}
          </h1>
          {displayLocation && (
            <p className="mt-1 text-sm text-zinc-400">{displayLocation}</p>
          )}
          <p className="mt-1 text-xs text-zinc-600">
            Recorded {formatDate(detail.session.date, "d MMM yyyy")}
          </p>
        </div>
        <AcceptedSessionActions
          acceptedSessionId={detail.id}
          initialLocalLocation={detail.localLocation}
          originalLocation={detail.session.location}
          initialLocalNotes={detail.localNotes}
          originalNotes={detail.session.notes}
        />
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-900 bg-blue-950/40 px-4 py-2.5 text-sm text-blue-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 19-7z" />
        </svg>
        <span>Shared by <span className="font-semibold">@{detail.session.user.username}</span></span>
      </div>

      {(detail.localNotes ?? detail.session.notes) && (
        <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {detail.localNotes ?? detail.session.notes}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Your Results
        </h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-zinc-500">Buy-in</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={detail.myBuyIn} /></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cash-out</p>
            <p className="text-sm font-semibold text-zinc-200"><CurrencyValue value={detail.myCashOut} /></p>
          </div>
          <div className="ml-auto">
            <p className="text-xs text-zinc-500 text-right">Profit</p>
            <p className={clsx(
              "text-2xl font-bold tabular-nums",
              detail.myProfit > 0 && "text-emerald-400",
              detail.myProfit < 0 && "text-red-400",
              detail.myProfit === 0 && "text-zinc-400"
            )}>
              <CurrencyValue value={detail.myProfit} sign />
            </p>
          </div>
        </div>
      </div>

      <AcceptedSessionPlayerList
        acceptedSessionId={detail.id}
        initialPlayers={detail.players}
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
