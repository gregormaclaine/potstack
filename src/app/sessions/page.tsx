import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionTable from "@/components/sessions/SessionTable";
import Button from "@/components/ui/Button";
import { serializeSession } from "@/lib/sessionUtils";
import type { SessionWithPlayers } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));
  const limit = 20;

  const [total, raw, pendingInviteCount] = await Promise.all([
    prisma.session.count({ where: { userId } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        players: {
          include: { player: { select: { name: true, group: { select: { id: true, name: true, color: true } } } } },
          orderBy: { player: { name: "asc" } },
        },
      },
    }),
    prisma.sessionInvite.count({ where: { inviteeId: userId, status: "PENDING" } }),
  ]);

  const sessions: SessionWithPlayers[] = raw.map(serializeSession);

  return (
    <PageWrapper>
      {pendingInviteCount > 0 && (
        <Link href="/notifications" className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 transition-colors hover:bg-emerald-950/60">
          <span>
            <span className="font-semibold">{pendingInviteCount} session {pendingInviteCount === 1 ? "invite" : "invites"}</span> waiting for your approval
          </span>
          <span className="text-emerald-500">View →</span>
        </Link>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Sessions</h1>
        <Link href="/sessions/new">
          <Button>New Session</Button>
        </Link>
      </div>
      <SessionTable
        sessions={sessions}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
      />
    </PageWrapper>
  );
}
