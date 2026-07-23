export function Alert({
  tone = "danger",
  children,
  title,
}: {
  tone?: "danger" | "signal" | "muted";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    danger: "border-danger/40 text-danger",
    signal: "border-signal/40 text-signal",
    muted: "border-ink-line text-ink-muted",
  };
  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
