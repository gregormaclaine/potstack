import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);
  const { id } = await params;

  const body: { fromPlayerId: number; toPlayerId?: number; newPlayerName?: string } =
    await request.json();

  if (!body.fromPlayerId) {
    return NextResponse.json({ error: "fromPlayerId is required" }, { status: 400 });
  }
  if (!body.toPlayerId && !body.newPlayerName?.trim()) {
    return NextResponse.json({ error: "toPlayerId or newPlayerName is required" }, { status: 400 });
  }

  const accepted = await prisma.acceptedSession.findUnique({
    where: { id: Number(id) },
    include: { invite: { select: { linkId: true } } },
  });

  if (!accepted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (accepted.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let toPlayerId = body.toPlayerId;

  if (!toPlayerId && body.newPlayerName) {
    const name = body.newPlayerName.trim();
    const existing = await prisma.player.findUnique({
      where: { userId_name: { userId, name } },
    });
    toPlayerId = existing
      ? existing.id
      : (await prisma.player.create({ data: { name, userId } })).id;
  }

  if (!toPlayerId) {
    return NextResponse.json({ error: "Could not resolve player" }, { status: 400 });
  }

  const toPlayer = await prisma.player.findUnique({
    where: { id: toPlayerId },
    select: { id: true, name: true },
  });
  if (!toPlayer || toPlayer === null) {
    return NextResponse.json({ error: "Target player not found" }, { status: 404 });
  }

  await prisma.playerEquivalence.upsert({
    where: { fromPlayerId_linkId: { fromPlayerId: body.fromPlayerId, linkId: accepted.invite.linkId } },
    create: { fromPlayerId: body.fromPlayerId, toPlayerId, linkId: accepted.invite.linkId },
    update: { toPlayerId },
  });

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "player linked in accepted session", {
    accepted_session_id: Number(id),
    from_player_id: body.fromPlayerId,
    to_player_id: toPlayerId,
  });

  return NextResponse.json({ toPlayerId: toPlayer.id, toPlayerName: toPlayer.name });
}
