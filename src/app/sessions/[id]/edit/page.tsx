import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionForm from "@/components/sessions/SessionForm";
import { formatDate } from "@/lib/formatters";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function EditSessionPage({ params, searchParams }: PageProps) {
  const userSession = await auth();
  const userId = Number(userSession!.user!.id);

  const [{ id }, { page }] = await Promise.all([params, searchParams]);
  const returnUrl = `/sessions${page && page !== "1" ? `?page=${page}` : ""}`;

  const session = await prisma.session.findUnique({
    where: { id: Number(id), userId },
    include: {
      players: {
        include: { player: { select: { name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  });

  if (!session) notFound();

  const defaultValues = {
    date: session.date.toISOString().slice(0, 10),
    location: session.location ?? undefined,
    notes: session.notes ?? undefined,
    buyIn: session.buyIn,
    cashOut: session.cashOut,
    players: session.players.map((sp) => ({
      playerId: sp.playerId,
      playerName: sp.player.name,
      buyIn: sp.buyIn,
      cashOut: sp.cashOut,
    })),
  };

  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Edit Session</h1>
        <p className="mt-1 text-xs text-zinc-600">
          Recorded {formatDate(session.createdAt, "d MMM yyyy 'at' HH:mm")}
        </p>
      </div>
      <SessionForm mode="edit" sessionId={session.id} defaultValues={defaultValues} returnUrl={returnUrl} />
    </PageWrapper>
  );
}
