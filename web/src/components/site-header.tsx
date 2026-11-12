"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Menu, User } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/hooks/use-favorites";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/*
 * Top bar (docs/web/DESIGN_SYSTEM.md, "Top bar and surfaces", 2026-11-12).
 * 72px, three columns so the nav sits on the true centre. The active page is Fired Clay text, the
 * same clay as the buttons; no pill, no underline.
 * Home and List Your Property: no surface of its own and no border. The bar stays at the top while
 * the page scrolls and always takes the colour of the section about to slide under it (useBarSurface),
 * light text over Ink. Desktop finder: fully transparent over the map, whose search and panels start
 * below it.
 * Other pages: a solid Porcelain (marketing) or white (app) bar with a hairline.
 */

const AUTH_PATHS = ["/account", "/sign-in", "/sign-up"];

const NAV = [
  { href: "/", label: "Home" },
  { href: "/find", label: "Looking for a Board?" },
  { href: "/owners", label: "List Your Property" },
];
// How It Works and About left the bar (owner's call, 2026-11-12): the landing covers both.
// The pages still exist and stay linked from the footer.

// Marketing pages sit on Warm Porcelain; the finder and the owner portal stay on white
const WARM_PATHS = ["/", "/how-it-works", "/owners", "/about", "/credits"];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Logo() {
  return (
    <Link href="/" className="flex h-11 items-center gap-2.5 rounded-md text-ink" aria-label="BoardEase home">
      <svg viewBox="0 0 28 28" className="be-logo-mark size-8" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#202a28" />
        <path d="M7 13.2 14 7.5l7 5.7V21a.8.8 0 0 1-.8.8h-3.7v-4.6h-5V21.8H7.8A.8.8 0 0 1 7 21v-7.8Z" fill="#fff" />
        <circle cx="14" cy="13.6" r="1.6" fill="#b44630" />
      </svg>
      <span className="font-display text-[21px] font-semibold tracking-[-0.03em]">BoardEase</span>
    </Link>
  );
}

// Pages whose bar has no surface of its own: it always matches the section just below it
const CLEAR_PATHS = ["/", "/owners"];

/**
 * "Invisible" bar on clear pages: it stays at the top while the page scrolls, has no border or shadow,
 * and takes the colour of the section that is about to slide under it (sections say which with
 * `data-bar="paper|stone|white|ink"`). So it reads as no bar at all, but content disappears cleanly
 * beneath it instead of colliding with the links. Over Ink the text turns light. Written straight to
 * the element (no re-render per scroll frame).
 */
function useBarSurface(enabled: boolean, path: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const below = document.elementFromPoint(window.innerWidth / 2, el.getBoundingClientRect().bottom + 1);
      const surface = below?.closest<HTMLElement>("[data-bar]")?.dataset.bar ?? "paper";
      if (el.dataset.surface !== surface) el.dataset.surface = surface;
    };
    // Scroll events do not bubble, so listen in the capture phase for the main scroller
    const onScroll = (e: Event) => {
      if (e.target instanceof HTMLElement && e.target.id === "main" && !frame) frame = requestAnimationFrame(update);
    };
    update();
    const late = setTimeout(update, 300); // after the page's first layout settles
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(late);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", update);
      delete el.dataset.surface;
    };
  }, [enabled, path]);
  return ref;
}

export function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
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
  const name = session?.user?.name || session?.user?.email || "";
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const warm = WARM_PATHS.includes(path);
  const clear = CLEAR_PATHS.includes(path);
  const barRef = useBarSurface(clear, path);

  const logOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("Couldn't log out. Try again.");
      return;
    }
    await refetch();
    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <header
        ref={barRef}
        className={cn(
          "z-40 grid h-18 shrink-0 grid-cols-[1fr_auto] items-center gap-4 border-b px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-10",
          clear
            ? "be-bar relative border-transparent bg-[var(--be-paper)]"
            : path === "/find"
              ? "relative border-hairline bg-white lg:absolute lg:inset-x-0 lg:top-0 lg:border-transparent lg:bg-transparent"
              : warm
                ? "relative border-limestone bg-porcelain"
                : "relative border-hairline bg-white",
        )}
      >
        <div className="flex items-center">
          <Logo />
        </div>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV.map((n) => {
              const active = isActive(n.href, path);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center px-3.5 text-[14.5px] tracking-[-0.005em] transition-colors duration-200",
                      active ? "font-semibold text-clay" : "font-medium text-ink-2 hover:text-ink",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <Link
            href="/saved"
            aria-current={path === "/saved" ? "page" : undefined}
            className="hidden h-10 items-center gap-2 rounded-full px-3.5 text-[14.5px] font-medium text-ink-2 transition-colors duration-200 hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-clay sm:inline-flex"
          >
            <Heart className="size-[17px]" strokeWidth={1.9} />
            Saved
            {saved.length > 0 && (
              <span
                key={pulse}
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1.5 text-caption font-semibold text-white tabular-nums",
                  pulse > 0 && "be-pulse",
                )}
              >
                {saved.length}
              </span>
            )}
          </Link>

          <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-ink/12 md:block" />

          {/* Account: one avatar button; the menu holds sign-in or account links */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={signedIn ? `Account menu for ${name}` : "Account menu: log in or sign up"}
              className={cn(
                "hidden size-10 place-items-center rounded-full transition-[background-color,box-shadow,scale] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 active:scale-[0.95] md:grid",
                signedIn ? "bg-ink text-[15px] font-semibold text-white hover:bg-ink-2" : "text-ink ring-1 ring-ink/20 hover:ring-ink/40",
                isPending && "opacity-0",
              )}
            >
              {signedIn ? initial : <User className="size-[18px]" strokeWidth={1.9} />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-60 rounded-xl p-1.5 shadow-[0_18px_40px_-18px_rgb(32_42_40/0.45)] ring-limestone">
              {signedIn ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="truncate px-2.5 pt-2 pb-1.5 text-footnote text-subtle">{name}</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body" render={<Link href="/account" />}>
                    Your account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body" render={<Link href="/inquiries" />}>
                    Your inquiries
                  </DropdownMenuItem>
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body" render={<Link href="/owner/dashboard" />}>
                    Owner portal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-limestone" />
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body" onClick={logOut}>
                    Log out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body font-medium" render={<Link href="/sign-in" />}>
                    Log in
                  </DropdownMenuItem>
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body" render={<Link href="/sign-up" />}>
                    Sign up
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-limestone" />
                  <DropdownMenuItem className="h-10 rounded-lg px-2.5 text-body text-ink-2" render={<Link href="/sign-up?role=owner" />}>
                    Create an owner account
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger aria-label="Open menu" className="grid size-11 place-items-center rounded-full text-ink hover:bg-ink/5 lg:hidden">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm gap-0 bg-[var(--be-paper)] p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-18 items-center border-b border-limestone px-5">
                <Logo />
              </div>
              <nav aria-label="Mobile" className="flex flex-col p-3">
                {[...NAV, { href: "/saved", label: `Saved${saved.length ? ` (${saved.length})` : ""}` }].map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={isActive(n.href, path) ? "page" : undefined}
                    className="flex h-12 items-center rounded-lg px-3 text-callout text-ink hover:bg-limestone/40 aria-[current=page]:font-semibold aria-[current=page]:text-clay"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex gap-2 border-t border-limestone p-4">
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
    </>
  );
}
