"use client";

import { useActionState } from "react";
import type { NormalizedLink } from "@/lib/core/normalize";
import {
  createLinkAction,
  updateLinkAction,
  type ActionResult,
} from "@/app/(dashboard)/links/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const initial: ActionResult = { ok: true };

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LinkForm({
  mode,
  link,
}: {
  mode: "create" | "edit";
  link?: NormalizedLink;
}) {
  const action = mode === "create" ? createLinkAction : updateLinkAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const devices = new Set(link?.targetingRules?.devices ?? []);
  const countries = (link?.targetingRules?.countries ?? []).join(", ");
  const languages = (link?.targetingRules?.languages ?? []).join(", ");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {mode === "edit" && link ? (
        <input type="hidden" name="id" value={link.id} />
      ) : null}

      {state.error ? <Alert title="Save failed">{state.error}</Alert> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Destination
        </h2>
        <Field label="Original URL" htmlFor="originalUrl">
          <Input
            id="originalUrl"
            name="originalUrl"
            type="url"
            required
            defaultValue={link?.originalUrl ?? ""}
            placeholder="https://example.com/landing"
          />
        </Field>
        <Field label="Custom short code" htmlFor="customCode" hint="Optional">
          <Input
            id="customCode"
            name="customCode"
            defaultValue={mode === "create" ? "" : link?.shortCode ?? ""}
            disabled={mode === "edit"}
            placeholder="summer-sale"
          />
        </Field>
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={link?.title ?? ""} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={link?.description ?? ""}
          />
        </Field>
        {mode === "edit" ? (
          <Field label="Active" htmlFor="isActive">
            <Select
              id="isActive"
              name="isActive"
              defaultValue={link?.isActive ? "true" : "false"}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        ) : null}
        <Field label="Expires at" htmlFor="expiresAt">
          <Input
            id="expiresAt"
            name="expiresAt"
            type="datetime-local"
            defaultValue={toLocalDatetime(link?.expiresAt ?? null)}
          />
        </Field>
        <Field label="Attribution window (hours)" htmlFor="attributionWindowHours">
          <Input
            id="attributionWindowHours"
            name="attributionWindowHours"
            type="number"
            min={1}
            max={2160}
            defaultValue={link?.attributionWindowHours ?? ""}
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          App routing
        </h2>
        <Field label="iOS App Store URL" htmlFor="iosAppStoreUrl">
          <Input
            id="iosAppStoreUrl"
            name="iosAppStoreUrl"
            type="url"
            defaultValue={link?.iosAppStoreUrl ?? ""}
          />
        </Field>
        <Field label="Android store URL" htmlFor="androidAppStoreUrl">
          <Input
            id="androidAppStoreUrl"
            name="androidAppStoreUrl"
            type="url"
            defaultValue={link?.androidAppStoreUrl ?? ""}
          />
        </Field>
        <Field label="Web fallback URL" htmlFor="webFallbackUrl">
          <Input
            id="webFallbackUrl"
            name="webFallbackUrl"
            type="url"
            defaultValue={link?.webFallbackUrl ?? ""}
          />
        </Field>
        <Field label="App scheme" htmlFor="appScheme">
          <Input
            id="appScheme"
            name="appScheme"
            defaultValue={link?.appScheme ?? ""}
            placeholder="myapp"
          />
        </Field>
        <Field label="iOS universal link" htmlFor="iosUniversalLink">
          <Input
            id="iosUniversalLink"
            name="iosUniversalLink"
            type="url"
            defaultValue={link?.iosUniversalLink ?? ""}
          />
        </Field>
        <Field label="Android app link" htmlFor="androidAppLink">
          <Input
            id="androidAppLink"
            name="androidAppLink"
            type="url"
            defaultValue={link?.androidAppLink ?? ""}
          />
        </Field>
        <Field label="Deep link path" htmlFor="deepLinkPath">
          <Input
            id="deepLinkPath"
            name="deepLinkPath"
            defaultValue={link?.deepLinkPath ?? ""}
            placeholder="/product/123"
          />
        </Field>
        <Field
          label="Deep link parameters (JSON)"
          htmlFor="deepLinkParameters"
          hint='e.g. {"sku":"123"}'
        >
          <Textarea
            id="deepLinkParameters"
            name="deepLinkParameters"
            defaultValue={
              link?.deepLinkParameters
                ? JSON.stringify(link.deepLinkParameters, null, 2)
                : ""
            }
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          UTM
        </h2>
        {(
          [
            ["utmSource", "Source", link?.utmParameters?.source],
            ["utmMedium", "Medium", link?.utmParameters?.medium],
            ["utmCampaign", "Campaign", link?.utmParameters?.campaign],
            ["utmTerm", "Term", link?.utmParameters?.term],
            ["utmContent", "Content", link?.utmParameters?.content],
          ] as const
        ).map(([name, label, value]) => (
          <Field key={name} label={label} htmlFor={name}>
            <Input id={name} name={name} defaultValue={value ?? ""} />
          </Field>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Targeting
        </h2>
        <fieldset className="md:col-span-2 flex flex-wrap gap-4">
          <legend className="mb-2 text-sm text-ink-muted">Devices</legend>
          {(["ios", "android", "web"] as const).map((device) => (
            <label key={device} className="flex items-center gap-2 text-sm text-ink-fg">
              <input
                type="checkbox"
                name="devices"
                value={device}
                defaultChecked={devices.has(device)}
              />
              {device}
            </label>
          ))}
        </fieldset>
        <Field
          label="Countries (comma-separated ISO)"
          htmlFor="countriesInput"
          hint="Stored as multiple values"
        >
          <Input
            id="countriesInput"
            name="countries"
            defaultValue={countries}
            placeholder="US, GB, DE"
            onBlur={(e) => {
              // Split comma list into one field value; server accepts getAll
              const parts = e.currentTarget.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              e.currentTarget.value = parts.join(", ");
            }}
          />
        </Field>
        <Field label="Languages (comma-separated)" htmlFor="languagesInput">
          <Input
            id="languagesInput"
            name="languages"
            defaultValue={languages}
            placeholder="en, ar"
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Open Graph
        </h2>
        <Field label="OG title" htmlFor="ogTitle">
          <Input id="ogTitle" name="ogTitle" defaultValue={link?.ogTitle ?? ""} />
        </Field>
        <Field label="OG type" htmlFor="ogType">
          <Input id="ogType" name="ogType" defaultValue={link?.ogType ?? ""} />
        </Field>
        <Field label="OG description" htmlFor="ogDescription">
          <Textarea
            id="ogDescription"
            name="ogDescription"
            defaultValue={link?.ogDescription ?? ""}
          />
        </Field>
        <Field label="OG image URL" htmlFor="ogImageUrl">
          <Input
            id="ogImageUrl"
            name="ogImageUrl"
            type="url"
            defaultValue={link?.ogImageUrl ?? ""}
          />
        </Field>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create link" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
