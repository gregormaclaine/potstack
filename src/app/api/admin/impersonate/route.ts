import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { captureEvent } from "@/lib/posthog";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("targetUserId" in body) ||
    typeof (body as Record<string, unknown>).targetUserId !== "number"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const targetUserId = (body as { targetUserId: number }).targetUserId;
  const adminId = session.user.id;

  if (String(targetUserId) === adminId) {
    return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, isAdmin: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.isAdmin) {
    return NextResponse.json({ error: "Cannot impersonate an admin" }, { status: 403 });
  }

  captureEvent(adminId, "admin began impersonation", {
    adminId,
    adminUsername: session.user.name,
    targetUserId: target.id,
    targetUsername: target.username,
  });

  return NextResponse.json({ userId: String(target.id), username: target.username });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.isImpersonating) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  captureEvent(session.impersonatorId!, "admin stopped impersonation", {
    adminId: session.impersonatorId,
    adminUsername: session.impersonatorName,
    targetUserId: session.user.id,
    targetUsername: session.user.name,
  });

  return NextResponse.json({ ok: true });
}
