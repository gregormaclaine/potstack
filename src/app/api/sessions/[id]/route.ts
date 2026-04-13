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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: playerInclude,
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: serializeSession(session) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Delete-and-recreate player rows
  await prisma.sessionPlayer.deleteMany({ where: { sessionId: Number(id) } });

  const session = await prisma.session.update({
    where: { id: Number(id) },
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

  return NextResponse.json({ session: serializeSession(session) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.session.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
