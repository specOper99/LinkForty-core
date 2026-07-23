"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  attributionAction,
  simulateAction,
  type SimulateState,
} from "@/app/(dashboard)/debug/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type LinkOption = { id: string; label: string };
type RefItem = { code?: string; name?: string; deviceType?: string; userAgent?: string };

export function DebugConsole({
  links,
  userAgents,
  countries,
  languages,
}: {
  links: LinkOption[];
  userAgents: RefItem[];
  countries: Array<{ code: string; name: string }>;
  languages: Array<{ code: string; name: string }>;
}) {
  const [simState, simAction, simPending] = useActionState(
    simulateAction,
    {} as SimulateState,
  );
  const [attrState, attrAction, attrPending] = useActionState(attributionAction, {});
  const [events, setEvents] = useState<string[]>([]);
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "open" | "error">(
    "idle",
  );
  const [liveLinkId, setLiveLinkId] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  function connectLive() {
    wsRef.current?.close();
    setLiveStatus("connecting");
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = new URL(`${proto}://${window.location.host}/api/debug/live`);
    if (liveLinkId) url.searchParams.set("linkId", liveLinkId);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;
    ws.onopen = () => setLiveStatus("open");
    ws.onerror = () => setLiveStatus("error");
    ws.onclose = () => setLiveStatus("idle");
    ws.onmessage = (msg) => {
      setEvents((prev) => [String(msg.data), ...prev].slice(0, 100));
    };
  }

  function disconnectLive() {
    wsRef.current?.close();
    wsRef.current = null;
    setLiveStatus("idle");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Simulate click
        </h2>
        <form action={simAction} className="flex flex-col gap-3">
          <Field label="Link" htmlFor="linkId">
            <Select id="linkId" name="linkId" required defaultValue="">
              <option value="" disabled>
                Select link
              </option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Device" htmlFor="deviceType">
            <Select id="deviceType" name="deviceType" defaultValue="ios">
              <option value="ios">ios</option>
              <option value="android">android</option>
              <option value="web">web</option>
            </Select>
          </Field>
          <Field label="User agent preset" htmlFor="uaPreset">
            <Select
              id="uaPreset"
              defaultValue=""
              onChange={(e) => {
                const ua = e.target.value;
                const input = document.getElementById(
                  "userAgent",
                ) as HTMLTextAreaElement | null;
                if (input && ua) input.value = ua;
              }}
            >
              <option value="">Custom</option>
              {userAgents.map((ua, i) => (
                <option key={i} value={ua.userAgent ?? ""}>
                  {ua.name || ua.deviceType || `UA ${i + 1}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="User-Agent" htmlFor="userAgent">
            <Textarea id="userAgent" name="userAgent" rows={3} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Country" htmlFor="country">
              <Select id="country" name="country" defaultValue="">
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language" htmlFor="language">
              <Select id="language" name="language" defaultValue="">
                <option value="">—</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="IP address" htmlFor="ipAddress">
            <Input id="ipAddress" name="ipAddress" placeholder="203.0.113.10" />
          </Field>
          <Button type="submit" disabled={simPending}>
            {simPending ? "Simulating…" : "Simulate"}
          </Button>
        </form>
        {simState.error ? <Alert>{simState.error}</Alert> : null}
        {simState.result ? (
          <pre className="overflow-x-auto rounded-md border border-ink-line bg-ink-elevated p-3 font-mono text-xs text-ink-fg">
            {JSON.stringify(simState.result, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Live stream (WS proxy)
        </h2>
        <p className="text-sm text-ink-muted">
          Browser connects to this dashboard&apos;s{" "}
          <code className="font-mono text-signal">/api/debug/live</code>. BFF
          proxies to Core with operator userId.
        </p>
        <Field label="Filter link id (optional)" htmlFor="liveLinkId">
          <Input
            id="liveLinkId"
            value={liveLinkId}
            onChange={(e) => setLiveLinkId(e.target.value)}
            placeholder="uuid"
          />
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={connectLive}
            disabled={liveStatus === "open" || liveStatus === "connecting"}
          >
            Connect
          </Button>
          <Button type="button" variant="secondary" onClick={disconnectLive}>
            Disconnect
          </Button>
          <span className="self-center font-mono text-xs text-ink-muted">
            status: {liveStatus}
          </span>
        </div>
        <ul className="max-h-80 overflow-y-auto rounded-md border border-ink-line bg-ink-elevated p-3 font-mono text-xs">
          {events.length === 0 ? (
            <li className="text-ink-muted">No events yet.</li>
          ) : (
            events.map((ev, i) => (
              <li key={i} className="border-b border-ink-line/50 py-1 text-ink-fg">
                {ev}
              </li>
            ))
          )}
        </ul>

        <h2 className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Attribution lookup
        </h2>
        <form action={attrAction} className="flex flex-col gap-3">
          <Field label="Fingerprint" htmlFor="fingerprint">
            <Input id="fingerprint" name="fingerprint" required />
          </Field>
          <Button type="submit" variant="secondary" disabled={attrPending}>
            {attrPending ? "Looking up…" : "Lookup"}
          </Button>
        </form>
        {attrState.error ? <Alert>{attrState.error}</Alert> : null}
        {attrState.result ? (
          <pre className="overflow-x-auto rounded-md border border-ink-line bg-ink-elevated p-3 font-mono text-xs">
            {JSON.stringify(attrState.result, null, 2)}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
