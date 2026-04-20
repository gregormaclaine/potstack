import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // populated in src/auth.ts (Node.js runtime only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PATHS.includes(nextUrl.pathname);

      if (!isLoggedIn && !isPublic) {
        return false; // NextAuth redirects to signIn page
      }
      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (nextUrl.pathname.startsWith("/admin") && !auth?.user?.isAdmin) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.avatar = user.avatar ?? null;
      }
      if (trigger === "update") {
        if (session?.avatar !== undefined) {
          token.avatar = session.avatar;
        }
        if (session?.impersonation !== undefined) {
          if (session.impersonation && token.isAdmin) {
            token.impersonatedUserId = session.impersonation.userId;
            token.impersonatedUsername = session.impersonation.username;
            token.impersonatedAvatar = session.impersonation.avatar ?? null;
            token.originalIsAdmin = true;
          } else {
            delete token.impersonatedUserId;
            delete token.impersonatedUsername;
            delete token.impersonatedAvatar;
            delete token.originalIsAdmin;
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      const adminId = token.id as string;
      const adminName = token.name as string;

      if (adminId) session.user.id = adminId;
      session.user.isAdmin = token.isAdmin ?? false;
      session.user.avatar = token.avatar ?? null;
      session.isImpersonating = false;

      if (token.impersonatedUserId) {
        session.user.id = token.impersonatedUserId;
        session.user.name = token.impersonatedUsername ?? null;
        session.user.isAdmin = false;
        session.user.avatar = token.impersonatedAvatar ?? null;
        session.isImpersonating = true;
        session.impersonatorId = adminId;
        session.impersonatorName = adminName;
      }

      return session;
    },
  },
};
