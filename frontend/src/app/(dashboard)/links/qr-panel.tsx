"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

export function QrPanel({ linkId }: { linkId: string }) {
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [size, setSize] = useState(256);
  const src = `/api/core/api/links/${linkId}/qr?format=${format}&size=${size}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
        QR code
      </h2>
      <div className="flex flex-wrap gap-3">
        <Field label="Format" htmlFor="qr-format">
          <Select
            id="qr-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as "png" | "svg")}
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </Select>
        </Field>
        <Field label="Size" htmlFor="qr-size">
          <Select
            id="qr-size"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            <option value={128}>128</option>
            <option value={256}>256</option>
            <option value={512}>512</option>
          </Select>
        </Field>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Link QR code"
        width={size}
        height={size}
        className="max-w-full rounded-md border border-ink-line bg-white p-2"
      />
      <a href={src} download={`link-${linkId}.${format}`}>
        <Button type="button" variant="secondary">
          Download
        </Button>
      </a>
    </section>
  );
}
