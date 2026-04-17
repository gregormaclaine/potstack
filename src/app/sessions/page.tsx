import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { cacheLife, cacheTag } from "next/cache";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionsView from "@/components/sessions/SessionsView";
import { serializeSession } from "@/lib/sessionUtils";
import { getSessionsPageData, SESSIONS_PAGE_LIMIT } from "@/lib/cache/sessions";
import SessionsLoading from "./loading";
import type { SessionWithPlayers, PokerEvent } from "@/types";
import type { EventModel } from "@/generated/prisma/models/Event";

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default function SessionsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<SessionsLoading />}>
      <SessionsAuthBridge searchParams={searchParams} />
    </Suspense>
  );
}

async function SessionsAuthBridge({ searchParams }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));

  return <SessionsCachedView userId={userId} page={page} />;
}

async function SessionsCachedView({ userId, page }: { userId: number; page: number }) {
  "use cache";
  cacheTag(`sessions:${userId}`, `events:${userId}`, `invites:${userId}`);
  cacheLife("hours");

  const [total, raw, rawEvents, pendingInviteCount] = await getSessionsPageData(userId, page);
  const limit = SESSIONS_PAGE_LIMIT;

  const sessions: SessionWithPlayers[] = raw.map(serializeSession);

  const events: PokerEvent[] = (rawEvents as EventModel[]).map((e) => ({
    id: e.id,
    name: e.name,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

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
      <SessionsView
        sessions={sessions}
        initialEvents={events}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
      />
    </PageWrapper>
  );
}
