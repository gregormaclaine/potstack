import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  const players = await prisma.player.findMany({
    where: search
      ? { name: { contains: search } }
      : undefined,
    orderBy: { name: "asc" },
    take: limit,
  });

  return NextResponse.json({ players });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A player with that name already exists" },
      { status: 409 }
    );
  }

  const player = await prisma.player.create({ data: { name } });
  return NextResponse.json({ player }, { status: 201 });
}
