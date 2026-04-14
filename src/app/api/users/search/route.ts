import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const query = request.nextUrl.searchParams.get("username") ?? "";
  if (!query) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      username: { contains: query, mode: "insensitive" },
      id: { not: userId },
    },
    select: { id: true, username: true },
    take: 5,
  });

  return NextResponse.json({ users });
}
