import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groupSearches: true },
  });

  return NextResponse.json({ searches: user?.groupSearches ?? [] });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body: { searches: unknown } = await request.json();

  if (!Array.isArray(body.searches)) {
    return NextResponse.json({ error: "Invalid searches" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { groupSearches: body.searches },
  });

  return NextResponse.json({ ok: true });
}
