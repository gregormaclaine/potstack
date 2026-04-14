import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageWrapper from "@/components/layout/PageWrapper";
import SessionForm from "@/components/sessions/SessionForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSessionPage({ params }: PageProps) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
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
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Edit Session</h1>
      <SessionForm mode="edit" sessionId={session.id} defaultValues={defaultValues} />
    </PageWrapper>
  );
}
