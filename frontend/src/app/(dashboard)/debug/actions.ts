"use server";

import { auth } from "@/lib/auth";
import { CoreApiError, getCoreClient } from "@/lib/core";
import { simulateRequestSchema } from "@/lib/core/schemas";
import { emptyToUndefined } from "@/lib/core/normalize";

export type SimulateState = {
  error?: string;
  result?: Record<string, unknown>;
};

export async function simulateAction(
  _prev: SimulateState,
  formData: FormData,
): Promise<SimulateState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const payload = simulateRequestSchema.parse({
      linkId: String(formData.get("linkId") ?? ""),
      deviceType: emptyToUndefined(String(formData.get("deviceType") ?? "")) || undefined,
      userAgent: emptyToUndefined(String(formData.get("userAgent") ?? "")),
      country: emptyToUndefined(String(formData.get("country") ?? "")),
      language: emptyToUndefined(String(formData.get("language") ?? "")),
      ipAddress: emptyToUndefined(String(formData.get("ipAddress") ?? "")),
    });
    const result = await getCoreClient().simulateClick(payload);
    return { result: result as Record<string, unknown> };
  } catch (err) {
    if (err instanceof CoreApiError) {
      if (err.status === 404) {
        return {
          error:
            "Core has no /api/debug/simulate (404). Upgrade Core (createServer registers debugRoutes) or await server.register(debugRoutes)",
        };
      }
      return {
        error: `${err.message}${err.body ? `: ${JSON.stringify(err.body)}` : ""}`,
      };
    }
    return { error: err instanceof Error ? err.message : "Simulate failed" };
  }
}

export async function attributionAction(
  _prev: { error?: string; result?: unknown },
  formData: FormData,
): Promise<{ error?: string; result?: unknown }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const fingerprint = String(formData.get("fingerprint") ?? "").trim();
  if (!fingerprint) return { error: "Fingerprint required" };

  try {
    const result = await getCoreClient().getAttribution(fingerprint);
    return { result };
  } catch (err) {
    if (err instanceof CoreApiError) {
      return {
        error: `${err.message}${err.body ? `: ${JSON.stringify(err.body)}` : ""}`,
      };
    }
    return { error: err instanceof Error ? err.message : "Lookup failed" };
  }
}
