import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { UpdateEventBody, PokerEvent } from "@/types";
import { captureEvent } from "@/lib/posthog";

function serializeEvent(e: {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}): PokerEvent {
  return {
    id: e.id,
    name: e.name,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

async function getOwnedEvent(id: number, userId: number) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.userId !== userId) return null;
  return event;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const { id } = await params;

  const event = await getOwnedEvent(Number(id), userId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const { id } = await params;

  const existing = await getOwnedEvent(Number(id), userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: UpdateEventBody = await req.json();
  const { name, startDate, endDate, color } = body;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(color !== undefined && { color }),
    },
  });

  captureEvent(session.user.name ?? `userId[${userId}]`, "event updated", {
    event_id: Number(id),
  });

  return NextResponse.json({ event: serializeEvent(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const { id } = await params;

  const existing = await getOwnedEvent(Number(id), userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.event.delete({ where: { id: Number(id) } });

  captureEvent(session.user.name ?? `userId[${userId}]`, "event deleted", {
    event_id: Number(id),
  });

  return NextResponse.json({ success: true });
}
