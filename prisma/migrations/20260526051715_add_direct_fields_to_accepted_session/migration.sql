-- DropForeignKey
ALTER TABLE "AcceptedSession" DROP CONSTRAINT "AcceptedSession_inviteId_fkey";

-- AlterTable
ALTER TABLE "AcceptedSession" ADD COLUMN     "linkId" INTEGER,
ADD COLUMN     "sessionPlayerId" INTEGER,
ALTER COLUMN "inviteId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AcceptedSession_sessionPlayerId_key" ON "AcceptedSession"("sessionPlayerId");

-- AddForeignKey
ALTER TABLE "AcceptedSession" ADD CONSTRAINT "AcceptedSession_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "SessionInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptedSession" ADD CONSTRAINT "AcceptedSession_sessionPlayerId_fkey" FOREIGN KEY ("sessionPlayerId") REFERENCES "SessionPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptedSession" ADD CONSTRAINT "AcceptedSession_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PlayerLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
