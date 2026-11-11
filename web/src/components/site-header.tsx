"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFavorites } from "@/hooks/use-favorites";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const AUTH_PATHS = ["/account", "/sign-in", "/sign-up"];

const NAV = [
  { href: "/", label: "Home" },
  { href: "/find", label: "Looking for a Board?" },
  { href: "/owners", label: "List Your Property" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

// Marketing pages sit on Warm Porcelain; the finder and the owner portal stay on white
const WARM_PATHS = ["/", "/how-it-works", "/owners", "/about", "/credits"];

export function Logo() {
  return (
    <Link href="/" className="flex h-11 items-center gap-2 rounded-md text-ink" aria-label="BoardEase home">
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#202a28" />
        <path d="M7 13.2 14 7.5l7 5.7V21a.8.8 0 0 1-.8.8h-3.7v-4.6h-5V21.8H7.8A.8.8 0 0 1 7 21v-7.8Z" fill="#fff" />
        <circle cx="14" cy="13.6" r="1.6" fill="#b44630" />
      </svg>
      <span className="font-display text-[19px] font-semibold tracking-[-0.025em]">BoardEase</span>
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const { saved } = useFavorites();
  // One pulse on the Saved count each time a listing is saved (motion #8)
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const onSaved = () => setPulse((p) => p + 1);
    window.addEventListener("boardease:saved", onSaved);
    return () => window.removeEventListener("boardease:saved", onSaved);
  }, []);
  const { data: session, isPending, refetch } = authClient.useSession();
  // Sign-in, sign-up and sign-out run as server actions, so re-read the session
  // whenever we arrive at or leave an auth-related page.
  const lastPath = useRef(path);
  useEffect(() => {
    const touched = [lastPath.current, path].some((p) => AUTH_PATHS.some((a) => p === a || p.startsWith(`${a}/`)));
    lastPath.current = path;
    if (touched) refetch();
  }, [path, refetch]);
  const signedIn = !!session?.user;
  const initial = (session?.user?.name || session?.user?.email || "?").trim().charAt(0).toUpperCase();
  const warm = WARM_PATHS.includes(path);
  return (
    <header
      className={cn(
        "relative z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 sm:px-6 lg:px-8",
        warm ? "border-limestone bg-porcelain" : "border-hairline bg-white",
      )}
    >
      <div className="flex items-center gap-10">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <li key={n.href}>
                  {/* Active page: a 2px Fired Clay rule under the label, not a filled pill */}
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-16 items-center px-3 text-[15px] transition-colors duration-150",
                      "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:rounded-full after:bg-clay after:transition-[scale] after:duration-200",
                      active ? "font-medium text-ink after:scale-x-100" : "text-ink-2 after:scale-x-0 hover:text-ink",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/saved"
          className="hidden h-10 items-center gap-1.5 rounded-md px-3 text-[15px] text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink sm:inline-flex"
        >
          <Heart className="size-4" strokeWidth={1.9} />
          Saved
          {saved.length > 0 && (
            <span
              key={pulse}
              className={cn(
                "ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1.5 text-caption font-semibold text-white tabular-nums",
                pulse > 0 && "be-pulse",
              )}
            >
              {saved.length}
            </span>
          )}
        </Link>
        {signedIn ? (
          <Link
            href="/account"
            className="hidden h-10 items-center gap-2 rounded-md pr-3 pl-1.5 text-[15px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-ink/5 md:inline-flex"
          >
            <span className="grid size-7 place-items-center rounded-full bg-ink text-caption font-semibold text-white" aria-hidden>
              {initial}
            </span>
            Account
          </Link>
        ) : (
          <>
            <Link
              href="/sign-in"
              className={cn(
                "hidden h-10 items-center rounded-md px-3.5 text-[15px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-ink/5 md:inline-flex",
                isPending && "invisible",
              )}
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className={cn(
                "hidden h-10 items-center rounded-md bg-ink px-4 text-[15px] font-medium whitespace-nowrap text-white transition-[background-color,scale] duration-150 hover:bg-ink-2 active:scale-[0.97] md:inline-flex",
                isPending && "invisible",
              )}
            >
              Sign up
            </Link>
          </>
        )}

        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="grid size-11 place-items-center rounded-md text-ink hover:bg-ink/5 lg:hidden"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[86vw] max-w-sm gap-0 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-16 items-center border-b border-hairline px-5">
              <Logo />
            </div>
            <nav aria-label="Mobile" className="flex flex-col p-3">
              {[...NAV, { href: "/saved", label: `Saved${saved.length ? ` (${saved.length})` : ""}` }].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "page" : undefined}
                  className="flex h-12 items-center rounded-md px-3 text-callout text-ink hover:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-clay"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex gap-2 border-t border-hairline p-4">
              {signedIn ? (
                <Link href="/account" className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink text-body font-medium text-white">
                  Your account
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="inline-flex h-11 flex-1 items-center justify-center rounded-md text-body font-medium ring-1 ring-ink/15">
                    Log in
                  </Link>
                  <Link href="/sign-up" className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink text-body font-medium text-white">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
