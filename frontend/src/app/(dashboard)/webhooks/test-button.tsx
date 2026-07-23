"use client";

import { useActionState, useState } from "react";
import { testWebhookAction } from "@/app/(dashboard)/webhooks/actions";
import type { ActionResult } from "@/app/(dashboard)/links/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initial: ActionResult = { ok: true };

export function TestWebhookButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(testWebhookAction, initial);
  const [ran, setRan] = useState(false);

  return (
    <form
      action={async (fd) => {
        setRan(true);
        await formAction(fd);
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Sending…" : "Send test delivery"}
      </Button>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {ran && state.ok && !state.error ? (
        <Alert tone="signal">Test delivery accepted.</Alert>
      ) : null}
    </form>
  );
}
