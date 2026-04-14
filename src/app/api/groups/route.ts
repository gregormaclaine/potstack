import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const groups = await prisma.playerGroup.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body = await request.json();
  const name = (body.name ?? "").trim();
  const color = (body.color ?? "zinc").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.playerGroup.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A group with that name already exists" },
      { status: 409 }
    );
  }

  const group = await prisma.playerGroup.create({ data: { name, color, userId } });

  captureEvent(session.user.name ?? `userId[${userId}]`, "group created", {
    group_id: group.id,
    color,
  });

  return NextResponse.json({ group }, { status: 201 });
}
