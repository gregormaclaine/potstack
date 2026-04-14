import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

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
  const color = body.color as string | undefined;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.playerGroup.findUnique({
    where: { id: Number(id), userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const conflict = await prisma.playerGroup.findFirst({
    where: { userId, name, NOT: { id: Number(id) } },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "A group with that name already exists" },
      { status: 409 }
    );
  }

  const group = await prisma.playerGroup.update({
    where: { id: Number(id) },
    data: { name, ...(color !== undefined ? { color } : {}) },
  });

  const changedName = existing.name !== name;
  const changedColor = color !== undefined && existing.color !== color;

  if (changedName) {
    captureEvent(session.user.name ?? `userId[${userId}]`, "group renamed", { group_id: Number(id) });
  }
  if (changedColor) {
    captureEvent(session.user.name ?? `userId[${userId}]`, "group color changed", {
      group_id: Number(id),
      color,
    });
  }

  return NextResponse.json({ group });
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

  const existing = await prisma.playerGroup.findUnique({
    where: { id: Number(id), userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Unassign all players from this group before deleting
  await prisma.player.updateMany({
    where: { groupId: Number(id), userId },
    data: { groupId: null },
  });

  await prisma.playerGroup.delete({ where: { id: Number(id) } });

  captureEvent(session.user.name ?? `userId[${userId}]`, "group deleted", { group_id: Number(id) });

  return NextResponse.json({ success: true });
}
