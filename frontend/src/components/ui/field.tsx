import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClass =
  "w-full rounded-md border border-ink-line bg-ink-elevated px-3 py-2 font-mono text-sm text-ink-fg outline-none ring-signal/40 placeholder:text-ink-muted/60 focus:ring-2";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm text-ink-muted">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-muted/80">{hint}</span> : null}
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={controlClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-24 resize-y`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={controlClass} {...props} />;
}
