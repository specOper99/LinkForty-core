"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/links", label: "Links" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/debug", label: "Debug" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 text-sm transition ${
              active
                ? "bg-signal/10 text-signal"
                : "text-ink-muted hover:bg-ink-elevated hover:text-ink-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
