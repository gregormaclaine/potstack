import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const VALID_CURRENCIES = new Set(["GBP", "USD", "EUR", "JPY", "CAD", "AUD", "CHF"]);

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const body: { curvedCharts?: boolean; currency?: string } = await request.json();

  const data: { settingsCurvedCharts?: boolean; settingsCurrency?: string } = {};

  if (typeof body.curvedCharts === "boolean") {
    data.settingsCurvedCharts = body.curvedCharts;
  }
  if (typeof body.currency === "string") {
    if (!VALID_CURRENCIES.has(body.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }
    data.settingsCurrency = body.currency;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}
