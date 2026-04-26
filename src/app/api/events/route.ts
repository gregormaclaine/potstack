import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { CreateEventBody, PokerEvent } from "@/types";
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ events: events.map(serializeEvent) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body: CreateEventBody = await req.json();
  const { name, startDate, endDate, color } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!startDate || !endDate) return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
  if (new Date(startDate) > new Date(endDate)) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      color: color ?? "emerald",
      userId,
    },
  });

  captureEvent(session.user.name ?? `userId[${userId}]`, "event created", {
    event_id: event.id,
    name: event.name,
  });

  return NextResponse.json({ event: serializeEvent(event) }, { status: 201 });
}
