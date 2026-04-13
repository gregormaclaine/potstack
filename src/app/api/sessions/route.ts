import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CreateSessionBody, SessionWithPlayers } from "@/types";

function serializeSession(session: {
  id: number;
  date: Date;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  players: Array<{
    id: number;
    playerId: number;
    buyIn: number;
    cashOut: number;
    profit: number;
    player: { name: string };
  }>;
}): SessionWithPlayers {
  return {
    id: session.id,
    date: session.date.toISOString(),
    location: session.location,
    notes: session.notes,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    players: session.players.map((sp) => ({
      id: sp.id,
      playerId: sp.playerId,
      playerName: sp.player.name,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
      profit: sp.profit,
    })),
    totalBuyIn: session.players.reduce((sum, sp) => sum + sp.buyIn, 0),
    totalCashOut: session.players.reduce((sum, sp) => sum + sp.cashOut, 0),
    totalProfit: session.players.reduce((sum, sp) => sum + sp.profit, 0),
  };
}

const playerInclude = {
  players: {
    include: { player: { select: { name: true } } },
    orderBy: { player: { name: "asc" as const } },
  },
};

export async function GET(request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(request.nextUrl.searchParams.get("limit") ?? "20"));
  const sortBy = request.nextUrl.searchParams.get("sortBy") ?? "date";
  const order = (request.nextUrl.searchParams.get("order") ?? "desc") as "asc" | "desc";

  const orderBy =
    sortBy === "date" ? { date: order } : { createdAt: order };

  const [total, raw] = await Promise.all([
    prisma.session.count(),
    prisma.session.findMany({
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: playerInclude,
    }),
  ]);

  const sessions = raw.map(serializeSession);

  return NextResponse.json({
    sessions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const body: CreateSessionBody = await request.json();

  if (!body.date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!body.players || body.players.length === 0) {
    return NextResponse.json(
      { error: "At least one player is required" },
      { status: 400 }
    );
  }

  const session = await prisma.session.create({
    data: {
      date: new Date(body.date),
      location: body.location ?? null,
      notes: body.notes ?? null,
      players: {
        create: body.players.map((p) => ({
          playerId: p.playerId,
          buyIn: p.buyIn,
          cashOut: p.cashOut,
          profit: p.cashOut - p.buyIn,
        })),
      },
    },
    include: playerInclude,
  });

  return NextResponse.json({ session: serializeSession(session) }, { status: 201 });
}
