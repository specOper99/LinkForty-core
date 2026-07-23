export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "signal" | "danger" | "muted" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-ink-line text-ink-fg",
    signal: "border-signal/40 text-signal",
    danger: "border-danger/40 text-danger",
    muted: "border-ink-line text-ink-muted",
    warn: "border-amber-500/50 text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
