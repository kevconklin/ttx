"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/exercises", label: "Exercises" },
  { href: "/clients", label: "Clients" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative grid h-8 w-8 place-items-center rounded-md bg-accent-600/15 ring-1 ring-inset ring-accent-500/40 transition group-hover:bg-accent-500/25">
            <span className="font-mono text-[13px] font-bold text-accent-200">T</span>
            <span className="absolute -inset-0.5 -z-10 rounded-md bg-accent-500/0 blur-md transition group-hover:bg-accent-500/30" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-ink">
              Tabletop Tools
            </span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-dim">
              Cybersecurity Consulting
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "text-accent-200"
                    : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-px bg-gradient-to-r from-transparent via-accent-500 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
