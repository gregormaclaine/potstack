import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildDashboardStats } from "@/lib/stats";
import { fetchAllForUser } from "@/lib/unified-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const sessions = await fetchAllForUser(userId);
  const stats = buildDashboardStats(sessions);
  return NextResponse.json(stats);
}
