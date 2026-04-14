import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  const players = await prisma.player.findMany({
    where: search
      ? { userId, name: { contains: search, mode: "insensitive" } }
      : { userId },
    orderBy: { sessions: { _count: "desc" } },
    take: limit,
  });

  return NextResponse.json({ players });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body = await request.json();
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A player with that name already exists" },
      { status: 409 }
    );
  }

  const player = await prisma.player.create({ data: { name, userId } });

  captureEvent(session.user.name ?? `userId[${userId}]`, "player created", { player_id: player.id });

  return NextResponse.json({ player }, { status: 201 });
}
