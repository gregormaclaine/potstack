import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

config({ path: new URL("../.env", import.meta.url).pathname });

const [, , username, newPassword] = process.argv;

if (!username || !newPassword) {
  console.error("Usage: npx tsx scripts/set-password.ts <username> <new-password>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set. Make sure .env exists at the project root.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  let user;
  try {
    user = await prisma.user.findUnique({ where: { username } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Error: Could not connect to the database.\n${msg}`);
    process.exit(1);
  }

  if (!user) {
    const all = await prisma.user.findMany({ select: { username: true } });
    const names = all.map((u) => `  - ${u.username}`).join("\n");
    console.error(
      `Error: No user found with username "${username}".` +
      (all.length ? `\n\nExisting users:\n${names}` : "\n\nNo users exist in the database.")
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { username }, data: { passwordHash } });

  console.log(`Password updated for "${username}"`);
}

main().finally(() => prisma.$disconnect());
