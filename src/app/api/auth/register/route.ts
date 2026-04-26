import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { captureEvent } from "@/lib/posthog";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = (body.username ?? "").trim();
  const usernameKey = username.toLowerCase();
  const password = body.password ?? "";

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { usernameKey } });
  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, usernameKey, passwordHash },
  });

  captureEvent(user.username, "user registered");

  return NextResponse.json(
    { id: user.id, username: user.username },
    { status: 201 }
  );
}
