import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { usernameKey: String(credentials.username).toLowerCase() },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash,
        );
        if (!valid) return null;
        return {
          id: String(user.id),
          name: user.username,
          isAdmin: user.isAdmin,
          avatar: user.avatar ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      const adminId = token.id as string;
      const adminName = token.name as string;

      if (adminId) session.user.id = adminId;
      session.user.isAdmin = token.isAdmin ?? false;
      session.isImpersonating = false;

      if (token.impersonatedUserId) {
        session.user.id = token.impersonatedUserId;
        session.user.name = token.impersonatedUsername ?? null;
        session.user.isAdmin = false;
        session.isImpersonating = true;
        session.impersonatorId = adminId;
        session.impersonatorName = adminName;
      }

      // Always fetch the latest avatar from DB so changes propagate across devices
      // without requiring re-login. The JWT caches the avatar per-device, so we
      // bypass it here.
      const rawId = token.impersonatedUserId ?? token.id;
      if (rawId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(rawId) },
          select: { avatar: true },
        });
        session.user.avatar = dbUser?.avatar ?? null;
      } else {
        session.user.avatar = null;
      }

      return session;
    },
  },
});
