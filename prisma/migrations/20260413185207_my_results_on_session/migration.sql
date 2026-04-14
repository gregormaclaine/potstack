/*
  Warnings:

  - Added the required column `buyIn` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cashOut` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add with defaults so existing rows are valid, then drop defaults
ALTER TABLE "Session" ADD COLUMN "buyIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "cashOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "profit" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Session" ALTER COLUMN "buyIn" DROP DEFAULT,
ALTER COLUMN "cashOut" DROP DEFAULT,
ALTER COLUMN "profit" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionPlayer" ALTER COLUMN "buyIn" DROP NOT NULL,
ALTER COLUMN "cashOut" DROP NOT NULL,
ALTER COLUMN "profit" DROP NOT NULL;
