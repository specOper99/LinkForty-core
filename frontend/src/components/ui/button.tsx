import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-signal text-ink-bg hover:bg-signal-bright disabled:opacity-60",
  secondary:
    "border border-ink-line text-ink-fg hover:border-signal/40 hover:text-signal",
  danger:
    "border border-danger/40 text-danger hover:bg-danger/10",
  ghost: "text-ink-muted hover:text-ink-fg",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
