"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CoreApiError, getCoreClient } from "@/lib/core";
import {
  createWebhookRequestSchema,
  updateWebhookRequestSchema,
  webhookEventSchema,
  type WebhookEvent,
} from "@/lib/core/schemas";
import { emptyToUndefined } from "@/lib/core/normalize";
import type { ActionResult } from "@/app/(dashboard)/links/actions";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function formString(form: FormData, key: string): string | undefined {
  return emptyToUndefined(String(form.get(key) ?? ""));
}

function formNumber(form: FormData, key: string): number | undefined {
  const raw = formString(form, key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

function toErrorMessage(err: unknown): string {
  if (err instanceof CoreApiError) {
    const body =
      typeof err.body === "object" && err.body
        ? JSON.stringify(err.body)
        : String(err.body ?? "");
    return `${err.message}${body ? `: ${body}` : ""}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function eventsFromForm(form: FormData): WebhookEvent[] {
  return form
    .getAll("events")
    .map(String)
    .filter((e): e is WebhookEvent => webhookEventSchema.safeParse(e).success);
}

export async function createWebhookAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  try {
    const payload = createWebhookRequestSchema.parse({
      name: String(formData.get("name") ?? ""),
      url: String(formData.get("url") ?? ""),
      events: eventsFromForm(formData),
      headers: parseHeaders(formString(formData, "headers")),
      retryCount: formNumber(formData, "retryCount"),
      timeoutMs: formNumber(formData, "timeoutMs"),
    });
    const webhook = await getCoreClient().createWebhook(payload);
    revalidatePath("/webhooks");
    // Secret reveal-once: pass via redirect query is bad; return to client then redirect
    return {
      ok: true,
      id: webhook.id,
      secret: typeof webhook.secret === "string" ? webhook.secret : undefined,
    };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function updateWebhookAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing webhook id" };

  try {
    const isActiveRaw = formString(formData, "isActive");
    const payload = updateWebhookRequestSchema.parse({
      name: formString(formData, "name"),
      url: formString(formData, "url"),
      events: eventsFromForm(formData),
      headers: parseHeaders(formString(formData, "headers")),
      retryCount: formNumber(formData, "retryCount"),
      timeoutMs: formNumber(formData, "timeoutMs"),
      isActive:
        isActiveRaw === undefined
          ? undefined
          : isActiveRaw === "true" || isActiveRaw === "on",
    });
    await getCoreClient().updateWebhook(id, payload);
    revalidatePath("/webhooks");
    revalidatePath(`/webhooks/${id}`);
    redirect(`/webhooks/${id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function deleteWebhookAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getCoreClient().deleteWebhook(id);
  revalidatePath("/webhooks");
  redirect("/webhooks");
}

export async function testWebhookAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing webhook id" };
  try {
    const result = await getCoreClient().testWebhook(id);
    return {
      ok: result.success !== false,
      error:
        result.success === false
          ? result.message || `Test failed (status ${result.status ?? "?"})`
          : undefined,
    };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}
