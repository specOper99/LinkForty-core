import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  operatorName,
}: {
  children: React.ReactNode;
  operatorName?: string | null;
}) {
  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(94,234,212,0.06),_transparent_50%),linear-gradient(180deg,#0b0f14_0%,#121820_100%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-line pb-4">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="group flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
                LinkForty
              </span>
              <span className="text-sm font-semibold text-ink-fg group-hover:text-signal">
                Core Dashboard
              </span>
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3">
            {operatorName ? (
              <span className="hidden font-mono text-xs text-ink-muted sm:inline">
                {operatorName}
              </span>
            ) : null}
            <form action={logoutAction}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex flex-col gap-6 pb-16">{children}</main>
      </div>
    </div>
  );
}
