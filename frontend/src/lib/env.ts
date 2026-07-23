import { z } from "zod";

/**
 * Core mounts at origin root (`/api/links`, `/api/sdk/v1/health`).
 * Vanilla Core often has no `/health` — that path is caught by `/:shortCode`.
 * People often set CORE_URL to `https://host/api` — strip that so we never hit `/api/api/...`.
 */
export function normalizeCoreUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  if (/\/api$/i.test(u)) {
    u = u.replace(/\/api$/i, "");
  }
  return u;
}

/** Trim + strip accidental wrapping quotes from Docker/.env. */
export function normalizeEnvString(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

const envSchema = z
  .object({
    CORE_URL: z.string().url(),
    /** Public shortlink / redirect base shown in UI (defaults to CORE_URL). */
    SHORTLINK_BASE_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(16),
    AUTH_URL: z.string().url().optional(),
    ADMIN_USERNAME: z.string().min(1),
    ADMIN_PASSWORD_HASH: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    /** Core `user_id` column is UUID — must be a real UUID, not "admin" / "user-1". */
    OPERATOR_USER_ID: z
      .string()
      .uuid(
        "Must be a UUID (e.g. 00000000-0000-4000-8000-000000000001). Generate: uuidgen",
      ),
    /** Optional Bearer token if Core/gateway requires Authorization (not vanilla Core). */
    CORE_API_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((value, ctx) => {
    if (!value.ADMIN_PASSWORD_HASH && !value.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set ADMIN_PASSWORD_HASH or ADMIN_PASSWORD",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.ADMIN_PASSWORD_HASH &&
      value.ADMIN_PASSWORD
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Production requires ADMIN_PASSWORD_HASH (bcrypt)",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const coreRaw = normalizeEnvString(process.env.CORE_URL);
  const shortRaw = normalizeEnvString(process.env.SHORTLINK_BASE_URL);
  const operatorRaw = normalizeEnvString(process.env.OPERATOR_USER_ID);

  const parsed = envSchema.safeParse({
    CORE_URL: coreRaw ? normalizeCoreUrl(coreRaw) : coreRaw,
    SHORTLINK_BASE_URL: shortRaw ? normalizeCoreUrl(shortRaw) : undefined,
    AUTH_SECRET: normalizeEnvString(process.env.AUTH_SECRET),
    AUTH_URL: normalizeEnvString(process.env.AUTH_URL),
    ADMIN_USERNAME: normalizeEnvString(process.env.ADMIN_USERNAME),
    ADMIN_PASSWORD_HASH: normalizeEnvString(process.env.ADMIN_PASSWORD_HASH),
    ADMIN_PASSWORD: normalizeEnvString(process.env.ADMIN_PASSWORD),
    OPERATOR_USER_ID: operatorRaw,
    CORE_API_TOKEN: normalizeEnvString(process.env.CORE_API_TOKEN),
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  cached = {
    ...parsed.data,
    CORE_URL: normalizeCoreUrl(parsed.data.CORE_URL),
    SHORTLINK_BASE_URL: parsed.data.SHORTLINK_BASE_URL
      ? normalizeCoreUrl(parsed.data.SHORTLINK_BASE_URL)
      : undefined,
  };
  return cached;
}

export function getCoreBaseUrl(): string {
  return getEnv().CORE_URL;
}

/** Public base for short / preview URLs (never force private CORE_URL into UI). */
export function getShortlinkBaseUrl(): string {
  const env = getEnv();
  return env.SHORTLINK_BASE_URL || env.CORE_URL;
}

export function getOperatorUserId(): string {
  return getEnv().OPERATOR_USER_ID;
}

/** Optional Authorization Bearer for gateways that wrap Core. */
export function getCoreApiToken(): string | undefined {
  return getEnv().CORE_API_TOKEN;
}
