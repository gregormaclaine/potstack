import { prisma } from "@/lib/prisma";
import type { NotificationData, NotificationType } from "@/types";

interface NotificationBase {
  userId: number;
  data: NotificationData;
  createdAt?: Date;
}

interface WithLink     { linkId: number }
interface WithInvite   { inviteId: number }
interface WithSession  { sessionId: number }

type CreateNotificationArgs = NotificationBase & Partial<WithLink & WithInvite & WithSession>;

export async function createNotification(args: CreateNotificationArgs): Promise<void> {
  const type: NotificationType = args.data.type;
  await prisma.notification.create({
    data: {
      userId:    args.userId,
      type,
      data:      args.data as object,
      linkId:    args.linkId   ?? null,
      inviteId:  args.inviteId ?? null,
      sessionId: args.sessionId ?? null,
      ...(args.createdAt ? { createdAt: args.createdAt } : {}),
    },
  });
}

/** Delete all link_request_received notifications for a given linkId and userId. */
export async function deleteLinkRequestReceivedNotification(
  linkId: number,
  userId: number,
): Promise<void> {
  await prisma.notification.deleteMany({
    where: { type: "link_request_received", linkId, userId },
  });
}

/** Delete all session_invite_received notifications for a given inviteId and userId. */
export async function deleteSessionInviteReceivedNotification(
  inviteId: number,
  userId: number,
): Promise<void> {
  await prisma.notification.deleteMany({
    where: { type: "session_invite_received", inviteId, userId },
  });
}
