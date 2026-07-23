import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Node crypto / bcrypt).
 * Full Credentials provider lives in auth.ts.
 */
function secureCookiesEnabled(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  const authUrl = process.env.AUTH_URL || "";
  return process.env.NODE_ENV === "production" && authUrl.startsWith("https://");
}

const secure = secureCookiesEnabled();

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12h
  },
  cookies: {
    sessionToken: {
      name: secure
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
      },
    },
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico";

      if (isPublic) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.name = token.name ?? "operator";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
