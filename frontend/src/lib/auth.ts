import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { getEnv } from "@/lib/env";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  clientIp: z.string().optional(),
});

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        clientIp: { label: "Client IP", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const env = getEnv();
        const ip = parsed.data.clientIp || "unknown";

        // Only failed attempts burn the budget (success must not lock out E2E / operator)
        const limited = rateLimit(`login:${ip}`, {
          limit: env.NODE_ENV === "production" ? 5 : 50,
          windowMs: 15 * 60 * 1000,
        });
        if (!limited.ok) {
          throw new Error(
            `Too many login attempts. Retry in ${limited.retryAfterSec}s`,
          );
        }

        const userOk = safeEqualString(
          parsed.data.username,
          env.ADMIN_USERNAME,
        );

        let passOk = false;
        // Prefer plain ADMIN_PASSWORD when set (local/e2e). Hash still required in production.
        if (env.ADMIN_PASSWORD) {
          passOk = safeEqualString(parsed.data.password, env.ADMIN_PASSWORD);
        }
        if (!passOk && env.ADMIN_PASSWORD_HASH) {
          passOk = await bcrypt.compare(
            parsed.data.password,
            env.ADMIN_PASSWORD_HASH,
          );
        }

        if (!userOk || !passOk) return null;

        resetRateLimit(`login:${ip}`);

        return {
          id: env.OPERATOR_USER_ID,
          name: env.ADMIN_USERNAME,
        };
      },
    }),
  ],
});
