ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usernameKey" TEXT;
UPDATE "User" SET "usernameKey" = lower(username) WHERE "usernameKey" IS NULL;
ALTER TABLE "User" ALTER COLUMN "usernameKey" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_usernameKey_key" ON "User"("usernameKey");
