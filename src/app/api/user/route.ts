import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AVATAR_IDS } from "@/lib/avatars";
import { captureEvent } from "@/lib/posthog";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  await prisma.$transaction([
    // SessionPlayer → Player has no onDelete cascade, so we must clear these first
    prisma.sessionPlayer.deleteMany({ where: { player: { userId } } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  captureEvent(user?.username ?? `userId[${userId}]`, "account deleted");

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body: { avatar?: string | null } = await request.json();

  if (body.avatar !== null && body.avatar !== undefined) {
    if (!AVATAR_IDS.has(body.avatar)) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatar: body.avatar ?? null },
    select: { avatar: true },
  });

  return NextResponse.json({ avatar: updated.avatar });
}
