import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DeleteSessionButton from "./DeleteSessionButton";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { clsx } from "clsx";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  });

  if (!session) notFound();

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
            <p className="text-sm font-semibold text-zinc-200">{formatCurrency(session.buyIn)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cash-out</p>
            <p className="text-sm font-semibold text-zinc-200">{formatCurrency(session.cashOut)}</p>
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
              {session.profit > 0 ? "+" : ""}
              {formatCurrency(session.profit)}
            </p>
          </div>
        </div>
      </div>

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
                {playersWithResults.map((sp) => (
                  <tr key={sp.id} className="bg-zinc-950">
                    <td className="px-4 py-3 font-medium text-zinc-100">{sp.player.name}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(sp.buyIn!)}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-400">{formatCurrency(sp.cashOut!)}</td>
                    <td className="px-4 py-3 text-right"><Badge value={sp.profit!} /></td>
                  </tr>
                ))}
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
              <span
                key={sp.id}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300"
              >
                {sp.player.name}
              </span>
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
