import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotification } from "@/lib/createNotification";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const type = request.nextUrl.searchParams.get("type");

  if (type === "sent") {
    const links = await prisma.playerLink.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        status: true,
        ownerPlayerId: true,
        linkedUser: { select: { username: true } },
      },
    });
    return NextResponse.json({
      links: links.map((l: (typeof links)[number]) => ({
        id: l.id,
        status: l.status,
        playerId: l.ownerPlayerId,
        linkedUsername: l.linkedUser.username,
      })),
    });
  }

  if (type === "received") {
    const links = await prisma.playerLink.findMany({
      where: { linkedUserId: userId, status: "PENDING" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        ownerUser: { select: { username: true } },
        ownerPlayer: { select: { name: true } },
      },
    });
    return NextResponse.json({
      links: links.map((l: (typeof links)[number]) => ({
        id: l.id,
        status: l.status,
        createdAt: l.createdAt.toISOString(),
        requesterUsername: l.ownerUser.username,
        playerName: l.ownerPlayer.name,
      })),
    });
  }

  return NextResponse.json({ error: "type must be 'sent' or 'received'" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body: { playerId: number; linkedUsername: string } = await request.json();

  // Verify the player belongs to the current user
  const player = await prisma.player.findUnique({
    where: { id: body.playerId, userId },
    include: { user: { select: { username: true } } },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Find the target user
  const target = await prisma.user.findUnique({
    where: { username: body.linkedUsername },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent self-linking
  if (target.id === userId) {
    return NextResponse.json({ error: "Cannot link to yourself" }, { status: 400 });
  }

  // Check for an existing link (any status)
  const existing = await prisma.playerLink.findUnique({
    where: { ownerPlayerId_linkedUserId: { ownerPlayerId: body.playerId, linkedUserId: target.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Link already exists" }, { status: 409 });
  }

  const link = await prisma.playerLink.create({
    data: {
      ownerPlayerId: body.playerId,
      ownerUserId: userId,
      linkedUserId: target.id,
      status: "PENDING",
    },
  });

  await createNotification({
    userId: target.id,
    linkId: link.id,
    data: {
      type: "link_request_received",
      requesterUsername: player.user.username,
      playerName: player.name,
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}
