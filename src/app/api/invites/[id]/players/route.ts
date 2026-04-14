import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSessionPlayers } from "@/lib/resolveSessionPlayers";
import { prisma } from "@/lib/prisma";

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
  const inviteId = Number(id);

  // Verify the invite belongs to this user
  const invite = await prisma.sessionInvite.findUnique({
    where: { id: inviteId },
    select: { inviteeId: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.inviteeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { resolved, unresolved } = await resolveSessionPlayers(inviteId, userId);

  return NextResponse.json({ resolved, unresolved });
}
