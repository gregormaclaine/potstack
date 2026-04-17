import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  createNotification,
  deleteLinkRequestReceivedNotification,
} from "@/lib/createNotification";
import { revalidateTag } from "next/cache";

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

  const link = await prisma.playerLink.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { equivalences: true } } },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (link.ownerUserId !== userId && link.linkedUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ link, equivalenceCount: link._count.equivalences });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const body: { action: "accept" | "reject"; targetPlayerId?: number; newPlayerName?: string } =
    await request.json();

  const link = await prisma.playerLink.findUnique({
    where: { id: Number(id) },
    include: {
      ownerUser:   { select: { username: true } },
      ownerPlayer: { select: { name: true } },
      linkedUser:  { select: { username: true } },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (link.linkedUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (link.status !== "PENDING") {
    return NextResponse.json({ error: "Link is not pending" }, { status: 400 });
  }

  if (body.action === "reject") {
    const updated = await prisma.playerLink.update({
      where: { id: Number(id) },
      data: { status: "REJECTED" },
    });

    // Replace the receiver's pending notification with a "rejected by me" one,
    // and notify the requester that their request was rejected.
    await Promise.all([
      deleteLinkRequestReceivedNotification(link.id, userId),
      createNotification({
        userId,
        data: {
          type: "link_rejected_received",
          otherUsername: link.ownerUser.username,
          playerName: link.ownerPlayer.name,
        },
      }),
      createNotification({
        userId: link.ownerUserId,
        data: {
          type: "link_rejected_sent",
          otherUsername: link.linkedUser.username,
          playerName: link.ownerPlayer.name,
        },
      }),
    ]);

    revalidateTag(`links:${userId}`, "max");
    revalidateTag(`links:${link.ownerUserId}`, "max");

    return NextResponse.json({ link: updated });
  }

  // Accept — resolve or create the target player
  let targetPlayerId = body.targetPlayerId ?? null;

  if (!targetPlayerId && body.newPlayerName) {
    const name = body.newPlayerName.trim();
    if (!name) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }
    const existing = await prisma.player.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (existing) {
      targetPlayerId = existing.id;
    } else {
      const created = await prisma.player.create({ data: { name, userId } });
      targetPlayerId = created.id;
    }
  }

  if (!targetPlayerId) {
    return NextResponse.json(
      { error: "Must select or create a player to represent the requester" },
      { status: 400 }
    );
  }

  // Verify the chosen player belongs to the current user
  const targetPlayer = await prisma.player.findUnique({
    where: { id: targetPlayerId, userId },
  });
  if (!targetPlayer) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const updated = await prisma.playerLink.update({
    where: { id: Number(id) },
    data: { status: "ACCEPTED", linkedPlayerId: targetPlayerId },
  });

  // Replace the receiver's pending notification and notify both parties.
  await Promise.all([
    deleteLinkRequestReceivedNotification(link.id, userId),
    // Acceptor (linkedUser): "You linked @ownerUsername to your player 'targetPlayer'"
    createNotification({
      userId,
      data: {
        type: "link_accepted",
        otherUsername: link.ownerUser.username,
        myPlayerName: targetPlayer.name,
      },
    }),
    // Requester (ownerUser): "You linked @linkedUsername to your player 'ownerPlayer'"
    createNotification({
      userId: link.ownerUserId,
      data: {
        type: "link_accepted",
        otherUsername: link.linkedUser.username,
        myPlayerName: link.ownerPlayer.name,
      },
    }),
  ]);

  revalidateTag(`links:${userId}`, "max");
  revalidateTag(`links:${link.ownerUserId}`, "max");

  return NextResponse.json({ link: updated });
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

  const link = await prisma.playerLink.findUnique({
    where: { id: Number(id) },
    include: {
      ownerUser:    { select: { username: true } },
      ownerPlayer:  { select: { name: true } },
      linkedUser:   { select: { username: true } },
      linkedPlayer: { select: { name: true } },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const isRequester = link.ownerUserId === userId;
  const isTarget    = link.linkedUserId === userId;

  if (!isRequester && !isTarget) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isRequester && link.status === "PENDING") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.playerLink.delete({ where: { id: Number(id) } });
  revalidateTag(`links:${link.ownerUserId}`, "max");
  revalidateTag(`links:${link.linkedUserId}`, "max");

  // Only fire link_broken notifications for previously-accepted links.
  if (link.status === "ACCEPTED" && link.linkedPlayer) {
    await Promise.all([
      createNotification({
        userId: link.ownerUserId,
        data: {
          type: "link_broken",
          otherUsername:   link.linkedUser.username,
          myPlayerName:    link.ownerPlayer.name,
          theirPlayerName: link.linkedPlayer.name,
        },
      }),
      createNotification({
        userId: link.linkedUserId,
        data: {
          type: "link_broken",
          otherUsername:   link.ownerUser.username,
          myPlayerName:    link.linkedPlayer.name,
          theirPlayerName: link.ownerPlayer.name,
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true });
}
