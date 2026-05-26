import { prisma } from '@/lib/prisma';

export type SessionStub = {
  id: number;
  source: 'owned' | 'accepted';
  url: string;
};

type StubRow = {
  id: number;
  source: 'owned' | 'accepted';
  date: Date;
  createdAt: Date;
};

async function fetchAllStubs(userId: number): Promise<StubRow[]> {
  const [owned, accepted] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      select: { id: true, date: true, createdAt: true },
    }),
    prisma.acceptedSession.findMany({
      where: { userId },
      select: { id: true, createdAt: true, session: { select: { date: true } } },
    }),
  ]);

  const rows: StubRow[] = [
    ...owned.map(s => ({ id: s.id, source: 'owned' as const, date: s.date, createdAt: s.createdAt })),
    ...accepted.map(a => ({ id: a.id, source: 'accepted' as const, date: a.session.date, createdAt: a.createdAt })),
  ];

  rows.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return rows;
}

function stubToUrl(stub: StubRow): string {
  return stub.source === 'owned' ? `/sessions/${stub.id}` : `/accepted-sessions/${stub.id}`;
}

export async function fetchAdjacentSessions(
  currentId: number,
  currentSource: 'owned' | 'accepted',
  userId: number,
): Promise<{ prev: SessionStub | null; next: SessionStub | null }> {
  const stubs = await fetchAllStubs(userId);
  const index = stubs.findIndex(s => s.id === currentId && s.source === currentSource);

  if (index === -1) return { prev: null, next: null };

  const prevStub = index > 0 ? stubs[index - 1] : null;
  const nextStub = index < stubs.length - 1 ? stubs[index + 1] : null;

  return {
    prev: prevStub ? { id: prevStub.id, source: prevStub.source, url: stubToUrl(prevStub) } : null,
    next: nextStub ? { id: nextStub.id, source: nextStub.source, url: stubToUrl(nextStub) } : null,
  };
}
