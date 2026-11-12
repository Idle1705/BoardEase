import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import { RevealRoot } from "./reveal";
import { ScrollScenes } from "./scroll-scenes";
import { JourneyProgress } from "./journey-progress";
import { FinderShowcase } from "./finder-showcase";
import corridor from "../../../public/editorial/cta-corridor.jpg";
import deskRoom from "../../../public/editorial/hero-room.jpg";
import apartmentBlock from "../../../public/editorial/owner-street.jpg";
import facade from "../../../public/editorial/hero-building.jpg";

/*
 * Landing page: minimal architectural editorial (docs/web/DESIGN_SYSTEM.md, "Minimal editorial landing").
 * Four parts: hero, two ways to begin, discover nearby, closing. Photography carries the story; text is
 * kept to headlines and one line each. Photos are Unsplash editorial images (public/editorial/MANIFEST.md)
 * and never stand for a listing; the showcase uses real finder screenshots with demo listings.
 */

export const WRAP = "mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10";
export const NOT_A_LISTING = "Editorial photo, not a listing";

export function LandingPage() {
  return (
    <RevealRoot className="flex-1 overflow-y-auto overflow-x-clip bg-porcelain">
      <Hero />
      <TwoWays />
      <Nearby />
      <FinalCta />
      <SiteFooter compact />
      <ScrollScenes />
    </RevealRoot>
  );
}

/*
 * A straight-edged photograph. The frame opens through a mask as it scrolls in (`data-scene=mask`)
 * and the photo drifts a few percent inside it (`data-drift`); both are off under reduced motion.
 */
export function Frame({
  src,
  alt,
  sizes,
  className,
  priority,
  position,
}: {
  src: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  position?: string;
}) {
  return (
    <div data-scene="mask" className={cn("be-photo relative overflow-hidden bg-limestone", className)}>
      <Image
        data-drift
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        placeholder="blur"
        priority={priority}
        className="object-cover"
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}

export const BTN_PRIMARY =
  "group inline-flex h-13 items-center gap-2.5 rounded-md bg-clay px-6 text-[17px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]";

/* ---------------------------------------------------------------- 1. Hero */

function Hero() {
  return (
    <section aria-labelledby="hero-title" data-bar="paper" className="be-canvas relative isolate pb-20 lg:pb-28">
      {/* Column rules start at the headline edge and stop before the photo */}
      <div aria-hidden className="be-columns pointer-events-none absolute inset-y-0 right-1/2 left-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] -z-10 hidden border-r border-ink/[0.045] lg:block" />
      {/* Split: text sits on the page grid's left edge; the photo runs to the right edge of the screen (FORMA) */}
      <div className="grid gap-y-10 lg:grid-cols-2 lg:items-end">
        <div className="px-5 pt-10 sm:px-8 sm:pt-14 lg:pt-0 lg:pr-14 lg:pb-14 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
          <h1
            id="hero-title"
            className="be-enter font-display text-[clamp(3rem,1rem+4.9vw,5.25rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance text-ink"
            style={{ ["--rise" as string]: "22px" }}
          >
            Your next room, closer than you think.
          </h1>
          <p className="be-enter mt-7 text-lead text-ink-2" style={{ ["--d" as string]: "110ms" }}>
            Find rooms and boarding houses near you.
          </p>
          <div className="be-enter mt-10 flex flex-wrap gap-3" style={{ ["--d" as string]: "190ms", ["--rise" as string]: "8px" }}>
            <Link href="/find" className={BTN_PRIMARY}>
              Looking for a Board?
              <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
            <Link
              href="/owners"
              className="inline-flex h-13 items-center rounded-md px-6 text-[17px] font-semibold text-ink ring-1 ring-ink/20 transition-[background-color,scale] duration-150 hover:bg-white active:scale-[0.97]"
            >
              List Your Property
            </Link>
          </div>
        </div>

        {/* One dominant photograph: opens upward once on load (CSS), then drifts gently as the hero leaves */}
        <figure className="px-5 sm:px-8 lg:px-0">
          <div
            data-scene="hero-photo"
            className="be-unveil relative aspect-[4/5] overflow-hidden bg-limestone sm:aspect-[5/4] lg:aspect-auto lg:h-[min(calc(100dvh-120px),860px)]"
            style={{ ["--d" as string]: "100ms" }}
          >
            <Image
              src={corridor}
              alt="An open-air corridor along a row of rooms in a low-rise residence, lit by afternoon sun"
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-[50%_60%]"
            />
          </div>
          <figcaption className="mt-3 text-caption text-subtle lg:pr-10">{NOT_A_LISTING}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 2. Two ways to begin */

const WAYS = [
  {
    href: "/find",
    title: "Find a space.",
    line: "Rooms, bedspaces and dorms on one map, with the monthly rent.",
    src: deskRoom,
    alt: "A small bedroom with a desk under the window and a white chair",
    position: "50% 55%",
  },
  {
    href: "/owners",
    title: "List your property.",
    line: "Add your rooms and beds, and choose what renters see.",
    src: apartmentBlock,
    alt: "A mid-rise apartment block with trees along a paved walkway",
    position: "40% 50%",
  },
] as const;

function TwoWays() {
  return (
    <section aria-labelledby="ways-title" data-bar="stone" className="be-stone py-24 sm:py-32">
      <h2 id="ways-title" className="sr-only">
        Two ways to begin
      </h2>
      {/* Editorial spread: two tall panels, the second set lower, so the eye reads them as a pair */}
      <div className={cn(WRAP, "grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:gap-x-16")}>
        {WAYS.map((w, i) => (
          <Link key={w.href} href={w.href} className={cn("be-hover group block outline-none", i === 1 && "sm:mt-28 lg:mt-40")}>
            <Frame src={w.src} alt={w.alt} position={w.position} sizes="(min-width: 640px) 50vw, 100vw" className="aspect-[4/5]" />
            <div className="mt-6 flex items-start justify-between gap-6" data-reveal>
              <div>
                <h3 className="font-display text-[clamp(1.75rem,1.1rem+1.6vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink underline-offset-[6px] decoration-[1.5px] group-hover:underline group-focus-visible:underline">
                  {w.title}
                </h3>
                <p className="mt-2.5 max-w-[34ch] text-body text-ink-2">{w.line}</p>
              </div>
              <span
                aria-hidden
                className="mt-1 grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-ink/20 transition-[background-color,color,rotate] duration-300 group-hover:rotate-45 group-hover:bg-clay group-hover:text-white group-hover:ring-clay"
              >
                <ArrowUpRight className="size-5" strokeWidth={2} />
              </span>
            </div>
            <p className="mt-3 text-caption text-subtle">{NOT_A_LISTING}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 3. Discover nearby */

function Nearby() {
  return (
    <section aria-labelledby="nearby-title" data-bar="white" className="bg-white py-20 sm:py-28">
      <div className={WRAP}>
        <h2
          id="nearby-title"
          data-reveal
          className="font-display text-[clamp(2.25rem,1.2rem+2.8vw,3.75rem)] leading-[1] font-semibold tracking-[-0.035em] text-ink"
        >
          Closer to what matters.
        </h2>
        <div className="mt-12 sm:mt-14">
          <FinderShowcase />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- How it works */

const RENTER_STEPS = [
  ["Search a location", "Type your school, office or barangay. The map shows rooms within the distance you choose."],
  ["Compare spaces", "Rent per month, room type, distance and what is included, side by side."],
  ["Contact the owner", "Message the owner and arrange a viewing. The exact address comes after that."],
];
const OWNER_STEPS = [
  ["Register a property", "Add the building once, with its street and area. The exact address stays private."],
  ["Add rooms and availability", "Single rooms, shared rooms or bedspaces, each with its own rent and number of beds."],
  ["Receive inquiries, manage rentals", "Answer renters, record tenants, and keep the rent book in the same place."],
];

/** Also used by /how-it-works, which supplies its own page title (`titled={false}`). */
export function HowItWorks({ titled = true }: { titled?: boolean }) {
  return (
    <section aria-labelledby={titled ? "how-title" : undefined} aria-label={titled ? undefined : "Steps"} className={titled ? "py-24 sm:py-32" : "pb-24"}>
      <div className={WRAP}>
        {titled && (
          <h2 id="how-title" data-reveal className="font-display text-section font-semibold text-ink">
            How BoardEase works
          </h2>
        )}
        <div className={cn("grid gap-16 lg:grid-cols-2 lg:gap-20", titled && "mt-14")}>
          <Journey title="If you are looking for a room" steps={RENTER_STEPS} level={titled ? "h3" : "h2"} />
          <Journey title="If you rent out rooms" steps={OWNER_STEPS} level={titled ? "h3" : "h2"} />
        </div>
      </div>
    </section>
  );
}

// Heading level follows the page: h3 under the landing section title, h2 directly under a page h1
function Journey({ title, steps, level: H = "h3" }: { title: string; steps: string[][]; level?: "h2" | "h3" }) {
  return (
    <div>
      <H data-reveal className="text-callout font-semibold text-ink">{title}</H>
      <JourneyProgress>
      <ol className="mt-6 border-t border-ink/15">
        {steps.map(([head, body], i) => (
          <li
            key={head}
            data-reveal
            data-step
            style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
            className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-ink/15 py-7"
          >
            <span aria-hidden data-step-num className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-clay tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-callout font-semibold text-ink">
                <span className="sr-only">Step {i + 1}: </span>
                {head}
              </p>
              <p className="mt-1.5 max-w-[42ch] text-body text-ink-2">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      </JourneyProgress>
    </div>
  );
}

/* ---------------------------------------------------------------- 4. Closing */

type CtaLink = { href: string; label: string };

/** Deep Ink closing. Also used by /how-it-works and /owners with their own wording. */
export function FinalCta({
  title = "Find a room. Or fill one.",
  primary = { href: "/find", label: "Find a Board" },
  secondary = { href: "/owners", label: "List Your Property" },
  photo = facade,
  alt = "The ochre facade of a low-rise apartment building between trees",
}: { title?: string; primary?: CtaLink; secondary?: CtaLink; photo?: StaticImageData; alt?: string } = {}) {
  return (
    <section aria-labelledby="cta-title" data-bar="ink" className="be-ink-warm overflow-hidden text-porcelain">
      <div className={cn(WRAP, "grid gap-x-12 gap-y-14 py-20 sm:py-28 lg:grid-cols-12 lg:items-end")}>
        <div className="lg:col-span-7 lg:pb-4" data-reveal>
          <span aria-hidden data-scene="cta-bar" className="block h-1 w-12 origin-left bg-clay" />
          <h2
            id="cta-title"
            className="mt-10 font-display text-[clamp(2.75rem,1rem+5.4vw,6.25rem)] leading-[0.95] font-semibold tracking-[-0.042em] text-balance"
          >
            {title}
          </h2>
          <div className="mt-11 flex flex-wrap gap-3">
            <Link href={primary.href} className={BTN_PRIMARY}>
              {primary.label}
              <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
            <Link
              href={secondary.href}
              className="inline-flex h-13 items-center rounded-md px-6 text-[17px] font-semibold text-porcelain ring-1 ring-porcelain/30 transition-[background-color,scale] duration-150 hover:bg-porcelain/10 active:scale-[0.97]"
            >
              {secondary.label}
            </Link>
          </div>
        </div>
        <figure className="w-[80%] justify-self-end sm:w-[56%] lg:col-span-5 lg:w-full">
          <Frame
            src={photo}
            alt={alt}
            sizes="(min-width: 1024px) 500px, 80vw"
            className="aspect-[4/5]"
          />
          <figcaption className="mt-3 text-caption text-porcelain/55">{NOT_A_LISTING}</figcaption>
        </figure>
      </div>
    </section>
  );
}
