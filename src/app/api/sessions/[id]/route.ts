import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";
import { computeAndSaveBreakdownStats } from "@/lib/computeBreakdownStats";
import { serializeSession, playerInclude, generateSessionInvites } from "@/lib/sessionUtils";
import { revalidateTag } from "next/cache";
import type { CreateSessionBody } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);

  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id: Number(id), userId },
    include: playerInclude,
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: serializeSession(session) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);

  const { id } = await params;
  const body: CreateSessionBody = await request.json();

  if (!body.date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (body.buyIn == null || body.cashOut == null) {
    return NextResponse.json(
      { error: "Buy-in and cash-out are required" },
      { status: 400 }
    );
  }

  // Verify session belongs to this user
  const existing = await prisma.session.findUnique({
    where: { id: Number(id), userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Delete-and-recreate player rows atomically (cascades delete SessionInvite rows too via FK)
  const session = await prisma.$transaction(async (tx) => {
    await tx.sessionPlayer.deleteMany({ where: { sessionId: Number(id) } });
    return tx.session.update({
      where: { id: Number(id) },
      data: {
        date: new Date(body.date),
        location: body.location ?? null,
        notes: body.notes ?? null,
        buyIn: body.buyIn,
        cashOut: body.cashOut,
        profit: body.cashOut - body.buyIn,
        players: body.players?.length
          ? {
              create: body.players.map((p) => ({
                playerId: p.playerId,
                buyIn: p.buyIn ?? null,
                cashOut: p.cashOut ?? null,
                profit:
                  p.buyIn != null && p.cashOut != null
                    ? p.cashOut - p.buyIn
                    : null,
              })),
            }
          : undefined,
      },
      include: playerInclude,
    });
  });

  // Re-generate session invites for accepted player links (both directions)
  if (body.players?.length && !body.skipInvites) {
    const playerIds = body.players.map((p) => p.playerId);
    await generateSessionInvites(Number(id), userId, playerIds, session.players, body.pendingLinkPlayerIds ?? []);
  }

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "session updated", {
    session_id: Number(id),
    buy_in: body.buyIn,
    cash_out: body.cashOut,
    profit: body.cashOut - body.buyIn,
    player_count: body.players?.length ?? 0,
    has_location: !!body.location,
    has_notes: !!body.notes,
  });

  await computeAndSaveBreakdownStats(userId);
  revalidateTag(`sessions:${userId}`, "max");

  return NextResponse.json({ session: serializeSession(session) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(userSession.user.id);

  const { id } = await params;

  const existing = await prisma.session.findUnique({
    where: { id: Number(id), userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.session.delete({ where: { id: Number(id) } });

  captureEvent(userSession.user.name ?? `userId[${userId}]`, "session deleted", {
    session_id: Number(id),
  });

  await computeAndSaveBreakdownStats(userId);
  revalidateTag(`sessions:${userId}`, "max");

  return NextResponse.json({ success: true });
}
