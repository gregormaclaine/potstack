import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionTable from "@/components/sessions/SessionTable";
import Button from "@/components/ui/Button";
import type { SessionWithPlayers } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));
  const limit = 20;

  const [total, raw] = await Promise.all([
    prisma.session.count(),
    prisma.session.findMany({
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        players: {
          include: { player: { select: { name: true } } },
          orderBy: { player: { name: "asc" } },
        },
      },
    }),
  ]);

  const sessions: SessionWithPlayers[] = raw.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    location: s.location,
    notes: s.notes,
    buyIn: s.buyIn,
    cashOut: s.cashOut,
    profit: s.profit,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    players: s.players.map((sp) => ({
      id: sp.id,
      playerId: sp.playerId,
      playerName: sp.player.name,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
    })),
  }));

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Sessions</h1>
        <Link href="/sessions/new">
          <Button>New Session</Button>
        </Link>
      </div>
      <SessionTable
        sessions={sessions}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
      />
    </PageWrapper>
  );
}
