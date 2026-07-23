export { CoreClient, CoreApiError, getCoreClient } from "@/lib/core/client";
export {
  BUILTIN_COUNTRIES,
  BUILTIN_LANGUAGES,
  BUILTIN_USER_AGENTS,
  flattenUserAgents,
} from "@/lib/core/debug-refs";
export {
  isAllowedCorePath,
  normalizeCorePath,
  pathUsesUserId,
} from "@/lib/core/allowlist";
export {
  normalizeLink,
  normalizeWebhook,
  emptyToUndefined,
  optionalUrl,
} from "@/lib/core/normalize";
export * from "@/lib/core/schemas";
