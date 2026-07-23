"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedWebhook } from "@/lib/core/normalize";
import {
  createWebhookAction,
  updateWebhookAction,
} from "@/app/(dashboard)/webhooks/actions";
import type { ActionResult } from "@/app/(dashboard)/links/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const EVENTS = ["click_event", "install_event", "conversion_event"] as const;
const initial: ActionResult = { ok: true };

export function WebhookForm({
  mode,
  webhook,
}: {
  mode: "create" | "edit";
  webhook?: NormalizedWebhook;
}) {
  const router = useRouter();
  const action = mode === "create" ? createWebhookAction : updateWebhookAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const selected = new Set(webhook?.events ?? ["click_event"]);

  useEffect(() => {
    if (mode === "create" && state.ok && state.id) {
      if (state.secret) setRevealedSecret(state.secret);
      else router.push(`/webhooks/${state.id}`);
    }
  }, [mode, state, router]);

  if (revealedSecret && state.id) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="signal" title="Webhook created — copy secret now">
          Secret is shown once. Store it for HMAC verification.
        </Alert>
        <code className="break-all rounded-md border border-ink-line bg-ink-elevated p-3 font-mono text-sm text-signal">
          {revealedSecret}
        </code>
        <Button type="button" onClick={() => router.push(`/webhooks/${state.id}`)}>
          Continue to webhook
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {mode === "edit" && webhook ? (
        <input type="hidden" name="id" value={webhook.id} />
      ) : null}
      {state.error ? <Alert title="Save failed">{state.error}</Alert> : null}

      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={webhook?.name ?? ""} />
      </Field>
      <Field label="Delivery URL" htmlFor="url">
        <Input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={webhook?.url ?? ""}
          placeholder="https://example.com/hooks/linkforty"
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm text-ink-muted">Events</legend>
        <div className="flex flex-wrap gap-4">
          {EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-2 text-sm text-ink-fg">
              <input
                type="checkbox"
                name="events"
                value={event}
                defaultChecked={selected.has(event)}
              />
              <span className="font-mono">{event}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "edit" ? (
        <Field label="Active" htmlFor="isActive">
          <Select
            id="isActive"
            name="isActive"
            defaultValue={webhook?.isActive ? "true" : "false"}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Retry count" htmlFor="retryCount">
          <Input
            id="retryCount"
            name="retryCount"
            type="number"
            min={1}
            max={10}
            defaultValue={webhook?.retryCount ?? 3}
          />
        </Field>
        <Field label="Timeout (ms)" htmlFor="timeoutMs">
          <Input
            id="timeoutMs"
            name="timeoutMs"
            type="number"
            min={1000}
            max={60000}
            defaultValue={webhook?.timeoutMs ?? 10000}
          />
        </Field>
      </div>

      <Field
        label="Custom headers (JSON)"
        htmlFor="headers"
        hint='Optional e.g. {"X-Env":"prod"}'
      >
        <Textarea
          id="headers"
          name="headers"
          defaultValue={
            webhook?.headers ? JSON.stringify(webhook.headers, null, 2) : ""
          }
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create webhook" : "Save changes"}
      </Button>
    </form>
  );
}
