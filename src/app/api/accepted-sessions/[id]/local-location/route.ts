import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);
  const { id } = await params;

  const body: { localLocation?: string | null; localNotes?: string | null } = await request.json();

  const accepted = await prisma.acceptedSession.findUnique({
    where: { id: Number(id) },
    select: { userId: true },
  });

  if (!accepted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (accepted.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { localLocation?: string | null; localNotes?: string | null } = {};
  if ("localLocation" in body) data.localLocation = body.localLocation ?? null;
  if ("localNotes" in body) data.localNotes = body.localNotes ?? null;

  await prisma.acceptedSession.update({ where: { id: Number(id) }, data });

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "accepted session overrides updated", {
    accepted_session_id: Number(id),
  });

  return NextResponse.json({ success: true });
}
