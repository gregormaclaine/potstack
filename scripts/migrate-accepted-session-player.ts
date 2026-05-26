/**
 * Backfills sessionPlayerId and linkId on AcceptedSession rows that have an invite.
 * Run once after the 20260526051715_add_direct_fields_to_accepted_session migration.
 *
 * Usage:  npx ts-node scripts/migrate-accepted-session-player.ts
 *     or: npx tsx scripts/migrate-accepted-session-player.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.acceptedSession.findMany({
    where: { inviteId: { not: null } },
    select: {
      id: true,
      sessionPlayerId: true,
      linkId: true,
      invite: { select: { sessionPlayerId: true, linkId: true } },
    },
  });

  const toUpdate = rows.filter(r => r.invite && (r.sessionPlayerId === null || r.linkId === null));

  if (toUpdate.length === 0) {
    console.log('Nothing to update — all rows already have sessionPlayerId and linkId.');
    return;
  }

  console.log(`Updating ${toUpdate.length} AcceptedSession rows...`);

  await Promise.all(
    toUpdate.map(r =>
      prisma.acceptedSession.update({
        where: { id: r.id },
        data: {
          sessionPlayerId: r.invite!.sessionPlayerId,
          linkId: r.invite!.linkId,
        },
      }),
    ),
  );

  console.log('Done.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
