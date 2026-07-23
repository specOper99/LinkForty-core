"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CoreApiError, getCoreClient } from "@/lib/core";
import {
  createLinkRequestSchema,
  updateLinkRequestSchema,
  type CreateLinkRequest,
  type UpdateLinkRequest,
} from "@/lib/core/schemas";
import { emptyToUndefined } from "@/lib/core/normalize";

export type ActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
  secret?: string;
};

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

function parseJsonRecord(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function linkPayloadFromForm(form: FormData): CreateLinkRequest {
  const countries = String(form.get("countries") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const devices = form
    .getAll("devices")
    .map(String)
    .filter((d): d is "ios" | "android" | "web" =>
      d === "ios" || d === "android" || d === "web",
    );
  const languages = String(form.get("languages") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const utm = {
    source: formString(form, "utmSource"),
    medium: formString(form, "utmMedium"),
    campaign: formString(form, "utmCampaign"),
    term: formString(form, "utmTerm"),
    content: formString(form, "utmContent"),
  };
  const hasUtm = Object.values(utm).some(Boolean);

  const targeting =
    countries.length || devices.length || languages.length
      ? {
          countries: countries.length ? countries : undefined,
          devices: devices.length ? devices : undefined,
          languages: languages.length ? languages : undefined,
        }
      : undefined;

  const expiresRaw = formString(form, "expiresAt");
  let expiresAt: string | undefined;
  if (expiresRaw) {
    const d = new Date(expiresRaw);
    if (!Number.isNaN(d.getTime())) expiresAt = d.toISOString();
  }

  return {
    originalUrl: String(form.get("originalUrl") ?? ""),
    title: formString(form, "title"),
    description: formString(form, "description"),
    customCode: formString(form, "customCode"),
    iosAppStoreUrl: formString(form, "iosAppStoreUrl"),
    androidAppStoreUrl: formString(form, "androidAppStoreUrl"),
    webFallbackUrl: formString(form, "webFallbackUrl"),
    appScheme: formString(form, "appScheme"),
    iosUniversalLink: formString(form, "iosUniversalLink"),
    androidAppLink: formString(form, "androidAppLink"),
    deepLinkPath: formString(form, "deepLinkPath"),
    deepLinkParameters: parseJsonRecord(formString(form, "deepLinkParameters")),
    utmParameters: hasUtm ? utm : undefined,
    targetingRules: targeting,
    ogTitle: formString(form, "ogTitle"),
    ogDescription: formString(form, "ogDescription"),
    ogImageUrl: formString(form, "ogImageUrl"),
    ogType: formString(form, "ogType"),
    attributionWindowHours: formNumber(form, "attributionWindowHours"),
    expiresAt,
  };
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

export async function createLinkAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  try {
    const payload = createLinkRequestSchema.parse(linkPayloadFromForm(formData));
    const link = await getCoreClient().createLink(payload);
    revalidatePath("/links");
    revalidatePath("/");
    redirect(`/links/${link.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function updateLinkAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing link id" };

  try {
    const base = linkPayloadFromForm(formData);
    const isActiveRaw = formString(formData, "isActive");
    const payload: UpdateLinkRequest = updateLinkRequestSchema.parse({
      ...base,
      isActive:
        isActiveRaw === undefined
          ? undefined
          : isActiveRaw === "true" || isActiveRaw === "on",
    });
    await getCoreClient().updateLink(id, payload);
    revalidatePath("/links");
    revalidatePath(`/links/${id}`);
    revalidatePath("/");
    redirect(`/links/${id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getCoreClient().deleteLink(id);
  revalidatePath("/links");
  revalidatePath("/");
  redirect("/links");
}

export async function duplicateLinkAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const link = await getCoreClient().duplicateLink(id);
  revalidatePath("/links");
  redirect(`/links/${link.id}`);
}

export async function setLinkActiveAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id) return;
  await getCoreClient().updateLink(id, { isActive });
  revalidatePath("/links");
  revalidatePath(`/links/${id}`);
}
