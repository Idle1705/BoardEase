"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDouble, Building2, ChartColumn, CircleDollarSign, Inbox, LayoutDashboard, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Only built modules are links. The rest are listed so owners see what is coming, marked "Soon".
const MODULES = [
  { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/properties", label: "My Properties", icon: Building2 },
  { href: "/owner/rooms", label: "Rooms & Availability", icon: BedDouble },
  { label: "Rental Inquiries", icon: Inbox },
  { label: "Tenants", icon: Users },
  { label: "Billing & Payments", icon: CircleDollarSign },
  { label: "Reports", icon: ChartColumn },
  { label: "Settings", icon: Settings },
] as const;

export function OwnerNav() {
  const path = usePathname();
  return (
    <nav aria-label="Owner portal" className="shrink-0 border-b border-limestone bg-white lg:w-64 lg:border-r lg:border-b-0">
      <p className="hidden px-6 pt-7 pb-3 text-footnote font-semibold text-subtle lg:block">Owner portal</p>
      <ul className="be-scroll-x flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:px-3 lg:py-0">
        {MODULES.map((m) => {
          const Icon = m.icon;
          if (!("href" in m)) {
            return (
              <li key={m.label} className="hidden lg:block">
                <span aria-disabled="true" className="flex h-10 items-center gap-3 rounded-md px-3 text-body text-subtle/80">
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                  {m.label}
                  <span className="ml-auto rounded-sm bg-surface px-1.5 py-0.5 text-caption">Soon</span>
                </span>
              </li>
            );
          }
          const active = path === m.href || path.startsWith(`${m.href}/`);
          return (
            <li key={m.href} className="shrink-0">
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-md px-3 text-body whitespace-nowrap transition-colors duration-150",
                  active ? "bg-clay-soft font-medium text-ink" : "text-ink-2 hover:bg-surface hover:text-ink",
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-clay lg:block" />}
                <Icon className={cn("size-[18px]", active ? "text-clay" : "")} strokeWidth={1.75} />
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
