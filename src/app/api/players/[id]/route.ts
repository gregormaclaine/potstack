import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id: Number(id), userId },
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const body = await request.json();
  const name = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const conflict = await prisma.player.findFirst({
    where: { userId, name, NOT: { id: Number(id) } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "A player with that name already exists" },
      { status: 409 }
    );
  }

  const before = await prisma.player.findUnique({
    where: { id: Number(id), userId },
    select: { name: true, groupId: true },
  });

  const updateData: { name: string; groupId?: number | null } = { name };
  if ("groupId" in body) {
    updateData.groupId = body.groupId === null ? null : Number(body.groupId);
  }

  const player = await prisma.player.update({
    where: { id: Number(id), userId },
    data: updateData,
    include: { group: true },
  });

  if (before && before.name !== name) {
    captureEvent(session.user.name ?? `userId[${userId}]`, "player renamed", { player_id: Number(id) });
  }

  if ("groupId" in body && before) {
    const newGroupId = body.groupId === null ? null : Number(body.groupId);
    if (newGroupId !== before.groupId) {
      if (newGroupId === null) {
        captureEvent(session.user.name ?? `userId[${userId}]`, "player removed from group", {
          player_id: Number(id),
        });
      } else {
        captureEvent(session.user.name ?? `userId[${userId}]`, "player assigned to group", {
          player_id: Number(id),
          group_id: newGroupId,
        });
      }
    }
  }

  return NextResponse.json({ player });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;

  const existing = await prisma.player.findUnique({
    where: { id: Number(id), userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const sessionCount = await prisma.sessionPlayer.count({
    where: { playerId: Number(id) },
  });

  if (sessionCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a player who has recorded sessions" },
      { status: 409 }
    );
  }

  await prisma.player.delete({ where: { id: Number(id) } });

  captureEvent(session.user.name ?? `userId[${userId}]`, "player deleted", { player_id: Number(id) });

  return NextResponse.json({ success: true });
}
