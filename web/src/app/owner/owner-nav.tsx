"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, Building2, ChartColumn, CircleDollarSign, Inbox, LayoutDashboard, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Built modules are links. `short` is the phone tab label, so no tab is cut off mid-word.
const BUILT = [
  { href: "/owner/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/properties", label: "My Properties", short: "Properties", icon: Building2 },
  { href: "/owner/rooms", label: "Rooms & Availability", short: "Rooms", icon: BedDouble },
] as const;

// Not built yet. Listed once, under one heading, so owners see what is coming without five "Soon" badges
// competing with the links they can use (desktop only; phones show just the working tabs).
const LATER = [
  { label: "Rental inquiries", icon: Inbox },
  { label: "Tenants", icon: Users },
  { label: "Billing and payments", icon: CircleDollarSign },
  { label: "Reports", icon: ChartColumn },
  { label: "Settings", icon: Settings },
] as const;

export function OwnerNav() {
  const path = usePathname();
  return (
    <nav aria-label="Owner portal" className="shrink-0 border-b border-limestone bg-white lg:w-64 lg:border-r lg:border-b-0">
      <p className="hidden px-6 pt-7 pb-3 text-footnote font-semibold text-subtle lg:block">Owner portal</p>
      <ul className="flex gap-1 px-3 py-2 lg:flex-col lg:px-3 lg:py-0">
        {BUILT.map((m) => {
          const Icon = m.icon;
          const active = path === m.href || path.startsWith(`${m.href}/`);
          return (
            <li key={m.href} className="min-w-0 flex-1 lg:flex-none">
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-2 rounded-md px-2 text-body whitespace-nowrap transition-colors duration-150 lg:h-10 lg:justify-start lg:gap-3 lg:px-3",
                  active ? "bg-clay-soft font-medium text-ink" : "text-ink-2 hover:bg-surface hover:text-ink",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-clay lg:block" />}
                <Icon className={cn("size-[18px] shrink-0", active ? "text-clay" : "")} strokeWidth={1.75} />
                <span className="lg:hidden">{m.short}</span>
                <span className="hidden lg:inline">{m.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden border-t border-limestone px-3 pt-5 pb-6 lg:mt-5 lg:block">
        <p id="later-title" className="px-3 pb-2 text-footnote font-semibold text-subtle">
          Coming later
        </p>
        <ul aria-labelledby="later-title" className="flex flex-col">
          {LATER.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.label} className="flex h-9 items-center gap-3 px-3 text-footnote text-subtle">
                <Icon className="size-4 opacity-70" strokeWidth={1.75} aria-hidden />
                {m.label}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
