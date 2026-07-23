import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(94,234,212,0.08),_transparent_55%),linear-gradient(180deg,#0b0f14_0%,#121820_100%)]"
      />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
            LinkForty
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-fg">
            Core Dashboard
          </h1>
          <p className="text-sm text-ink-muted">
            Single-operator console. Session stays on this host; Core stays
            private.
          </p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
