import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DeleteSessionButton from "./DeleteSessionButton";
import { formatDate, formatCurrency } from "@/lib/formatters";

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

  const totalBuyIn = session.players.reduce((s, p) => s + p.buyIn, 0);
  const totalCashOut = session.players.reduce((s, p) => s + p.cashOut, 0);
  const totalProfit = totalCashOut - totalBuyIn;

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
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <DeleteSessionButton sessionId={session.id} />
        </div>
      </div>

      {session.notes && (
        <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {session.notes}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead className="border-b border-zinc-800 bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Player
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Buy-in
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Cash-out
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Profit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {session.players.map((sp) => (
              <tr key={sp.id} className="bg-zinc-950">
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {sp.player.name}
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-400">
                  {formatCurrency(sp.buyIn)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-400">
                  {formatCurrency(sp.cashOut)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge value={sp.profit} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-700 bg-zinc-900">
            <tr>
              <td className="px-4 py-3 text-sm font-semibold text-zinc-300">
                Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                {formatCurrency(totalBuyIn)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                {formatCurrency(totalCashOut)}
              </td>
              <td className="px-4 py-3 text-right">
                <Badge value={totalProfit} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-start">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            ← Back to Sessions
          </Button>
        </Link>
      </div>
    </PageWrapper>
  );
}
