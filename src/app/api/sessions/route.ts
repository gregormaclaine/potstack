import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { captureEvent } from "@/lib/posthog";
import { computeAndSaveBreakdownStats } from "@/lib/computeBreakdownStats";
import { serializeSession, playerInclude, generateSessionInvites } from "@/lib/sessionUtils";
import { revalidateTag } from "next/cache";
import type { CreateSessionBody } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(request.nextUrl.searchParams.get("limit") ?? "20"));
  const sortBy = request.nextUrl.searchParams.get("sortBy") ?? "date";
  const order = (request.nextUrl.searchParams.get("order") ?? "desc") as "asc" | "desc";

  const orderBy =
    sortBy === "date" ? { date: order } : { createdAt: order };

  const [total, raw] = await Promise.all([
    prisma.session.count({ where: { userId } }),
    prisma.session.findMany({
      where: { userId },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: playerInclude,
    }),
  ]);

  const sessions = raw.map(serializeSession);

  return NextResponse.json({
    sessions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

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

  const dbSession = await prisma.session.create({
    data: {
      date: new Date(body.date),
      location: body.location ?? null,
      notes: body.notes ?? null,
      buyIn: body.buyIn,
      cashOut: body.cashOut,
      profit: body.cashOut - body.buyIn,
      userId,
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

  // Generate session invites for accepted player links (both directions)
  if (body.players?.length && !body.skipInvites) {
    const playerIds = body.players.map((p) => p.playerId);
    await generateSessionInvites(dbSession.id, userId, playerIds, dbSession.players, body.pendingLinkPlayerIds ?? []);
  }

  captureEvent(session.user.name ?? `userId[${userId}]`, "session created", {
    session_id: dbSession.id,
    buy_in: body.buyIn,
    cash_out: body.cashOut,
    profit: body.cashOut - body.buyIn,
    player_count: body.players?.length ?? 0,
    has_location: !!body.location,
    has_notes: !!body.notes,
  });

  await computeAndSaveBreakdownStats(userId);
  revalidateTag(`sessions:${userId}`, "max");

  return NextResponse.json({ session: serializeSession(dbSession) }, { status: 201 });
}
