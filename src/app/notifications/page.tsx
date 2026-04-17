import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PageWrapper from "@/components/layout/PageWrapper";
import NotificationsFeed from "@/components/invites/NotificationsFeed";
import type { NotificationRow, NotificationData, NotificationType } from "@/types";

export default async function InvitesPage() {
  const session = await auth();
  const userId = Number(session!.user!.id);

  const [rawNotifications, myPlayers] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      include: {
        link:   { select: { status: true } },
        invite: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    }),
  ]);

  const notifications: NotificationRow[] = rawNotifications.map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    data: n.data as NotificationData,
    sessionId: n.sessionId,
    linkId:    n.linkId,
    inviteId:  n.inviteId,
    link:   n.link   ? { status: n.link.status }   : null,
    invite: n.invite ? { status: n.invite.status } : null,
  }));

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">Notifications</h1>
      <NotificationsFeed notifications={notifications} myPlayers={myPlayers} />
    </PageWrapper>
  );
}
