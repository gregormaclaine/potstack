import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDashboardStats } from "@/lib/stats";
import type { SessionWithPlayers } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = await prisma.session.findMany({
    orderBy: { date: "asc" },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  });

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

  const stats = buildDashboardStats(sessions);
  return NextResponse.json(stats);
}
