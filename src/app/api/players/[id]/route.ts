import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    include: {
      sessions: {
        include: { session: true },
        orderBy: { session: { date: "desc" } },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ player });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const conflict = await prisma.player.findFirst({
    where: { name, NOT: { id: Number(id) } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "A player with that name already exists" },
      { status: 409 }
    );
  }

  const player = await prisma.player.update({
    where: { id: Number(id) },
    data: { name },
  });

  return NextResponse.json({ player });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sessions = await prisma.sessionPlayer.count({
    where: { playerId: Number(id) },
  });

  if (sessions > 0) {
    return NextResponse.json(
      { error: "Cannot delete a player who has recorded sessions" },
      { status: 409 }
    );
  }

  await prisma.player.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
