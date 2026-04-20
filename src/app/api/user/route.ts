import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AVATAR_IDS } from "@/lib/avatars";

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
