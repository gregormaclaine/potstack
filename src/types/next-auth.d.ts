import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; isAdmin: boolean; avatar?: string | null } & DefaultSession["user"];
    isImpersonating: boolean;
    impersonatorId?: string;
    impersonatorName?: string;
  }
  interface User extends DefaultUser {
    isAdmin: boolean;
    avatar?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    isAdmin?: boolean;
    avatar?: string | null;
    impersonatedUserId?: string;
    impersonatedUsername?: string;
    impersonatedAvatar?: string | null;
    originalIsAdmin?: boolean;
  }
}
