"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { formatPeso, formatPesoShort } from "@/lib/format";
import { distanceKm, formatKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Landing scroll story (Motion Director focal moment, docs/web/DESIGN_SYSTEM.md).
 * A drawn map stays on screen (CSS sticky, no pinning) while four chapters scroll past; scroll
 * progress drives a GSAP timeline that builds the search step by step.
 * The markup is the FINISHED state: without JavaScript, or with reduced motion, the reader sees
 * the complete map and all four chapters. The timeline only sets the earlier states when it runs.
 */

// Extra room at the top so no price pin sits under the search pill and budget chip
const BOX = { west: 125.575, east: 125.617, south: 7.043, north: 7.093 };
const CENTRE = { lat: 7.0655, lng: 125.5985 }; // University of Mindanao, Matina (the finder's default)
const BUDGET = 5000;
const SELECTED = "demo-matina-private-desk";

// Markers live in a band below the search pill and budget chip (top 20%) and above the bottom edge,
// at every screen shape. The drawn map is illustrative, so this placement does not misstate distances.
const BAND = { top: 20, height: 74 };
const pct = (lat: number, lng: number) => ({
  left: `${((lng - BOX.west) / (BOX.east - BOX.west)) * 100}%`,
  top: `${BAND.top + ((BOX.north - lat) / (BOX.north - BOX.south)) * BAND.height}%`,
});

const CHAPTERS = [
  ["Start where you study or work.", "Type your school, office or barangay. BoardEase puts it at the centre and draws the distance you are willing to travel."],
  ["Every price, on the map.", "Rooms show up as their monthly rent, right where they are. You see what a place costs before you open it."],
  ["Set what you can afford.", "Choose a budget and the rooms above it step back, so you only weigh the ones that fit."],
  ["Pick one and see the room.", "Press a price to open the room: photos, what is included and how far it is. Message the owner when you are ready."],
];

export function StorySection() {
  const root = useRef<HTMLElement>(null);

  const shown = DEMO_LISTINGS.filter((l) => l.lng > BOX.west && l.lng < BOX.east && l.lat > BOX.south && l.lat < BOX.north)
    .map((l) => ({ ...l, km: distanceKm(CENTRE, l) }))
    .sort((a, b) => a.km - b.km);
  const affordable = shown.filter((l) => l.monthlyPrice <= BUDGET).length;
  const pick = shown.find((l) => l.id === SELECTED) ?? shown[0];

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const scroller = el.closest("main") ?? undefined;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      el.classList.add("be-story-ready");
      const q = gsap.utils.selector(el);
      const chapters = q("[data-chapter]") as HTMLElement[];

      // Chapter text: the one being read is full strength, the others step back
      for (const ch of chapters) {
        ScrollTrigger.create({
          trigger: ch,
          scroller,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => (self.isActive ? ch.setAttribute("data-active", "") : ch.removeAttribute("data-active")),
        });
      }

      // The map, built step by step as the chapters scroll (one timeline unit per chapter)
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: q("[data-chapters]")[0],
          scroller,
          start: "top 62%",
          // Finish while the map is still on screen: the last chapter ends with the room card in place
          end: "bottom 92%",
          scrub: 0.6,
        },
      });

      // 1. Search: the pill arrives, its text wipes in, the point drops, the distance ring opens
      tl.fromTo(q("[data-s=pill]"), { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0)
        .fromTo(q("[data-s=pill-text]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: "none" }, 0.12)
        .fromTo(q("[data-s=point]"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.2, ease: "back.out(1.6)" }, 0.5)
        .fromTo(q("[data-s=ring]"), { scale: 0.15, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, 0.58)
        // 2. Prices: pins rise in, nearest first
        .fromTo(q("[data-pin]"), { autoAlpha: 0, y: 10, scale: 0.7 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.09 }, 1.05)
        .fromTo(q("[data-s=count-all]"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 1.6)
        // 3. Budget: the chip arrives and the rooms above it step back
        .fromTo(q("[data-s=budget]"), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.25 }, 2.05)
        .fromTo(q("[data-pin][data-over]"), { opacity: 1, scale: 1 }, { opacity: 0.3, scale: 0.9, duration: 0.35, ease: "power1.inOut" }, 2.3)
        .to(q("[data-s=count-all]"), { autoAlpha: 0, y: -8, duration: 0.18 }, 2.45)
        .fromTo(q("[data-s=count-budget]"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 2.6)
        // 4. Pick: one price turns Fired Clay and its room rises into view
        .fromTo(
          q("[data-pin][data-sel]"),
          { backgroundColor: "#ffffff", color: "#202a28", scale: 1 },
          { backgroundColor: "#b44630", color: "#ffffff", scale: 1.12, duration: 0.25 },
          3.35,
        )
        .fromTo(q("[data-s=card]"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" }, 3.5)
        .to({}, { duration: 0.35 }); // a short hold at the end before the section scrolls away

      // Measure again once fonts and photos have settled
      const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => {
        cancelAnimationFrame(raf);
        el.classList.remove("be-story-ready");
        chapters.forEach((c) => c.removeAttribute("data-active"));
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={root} aria-labelledby="story-title" className="bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-24 sm:px-8 sm:pt-28 lg:px-10">
        <div className="grid items-end gap-6 lg:grid-cols-12">
          <h2 id="story-title" data-reveal className="font-display text-section font-semibold text-balance text-ink lg:col-span-6">
            See what is near, and what it costs.
          </h2>
          <p data-reveal className="text-prose text-ink-2 lg:col-span-5 lg:col-start-8">
            Scroll through a search the way a renter would. Prices sit on the map, so rent and distance are compared at a glance.
          </p>
        </div>

        {/* Map and chapters share one grid row, so the sticky map has the full story height to stick within.
            Phones: both sit in the same cell and the chapters scroll up under the map. */}
        <div className="mt-10 grid grid-cols-1 gap-x-12 lg:mt-16 lg:grid-cols-12">
          {/* The map: sticky while the chapters scroll past */}
          <div className="pointer-events-none relative z-10 col-start-1 row-start-1 lg:col-span-7 lg:col-start-6">
            <div className="pointer-events-auto sticky top-0 bg-white pt-3 pb-4 lg:top-[max(24px,calc(50dvh-360px))] lg:py-0">
              <StoryMap shown={shown} affordable={affordable} pick={pick} />
            </div>
          </div>

          {/* Chapters */}
          <ol data-chapters className="col-start-1 row-start-1 pt-[calc(50vh+28px)] lg:col-span-5 lg:col-start-1 lg:pt-0">
            {CHAPTERS.map(([title, body], i) => (
              <li key={title} data-chapter className="flex min-h-[52vh] items-center py-10 lg:min-h-[72vh] lg:py-0">
                <div>
                  <span aria-hidden className="font-display text-[15px] font-semibold tracking-[0.01em] text-clay tabular-nums">
                    {String(i + 1).padStart(2, "0")} / 04
                  </span>
                  <h3 className="mt-3 font-display text-[clamp(26px,3vw,34px)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-4 max-w-[38ch] text-prose text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-limestone pt-8 pb-24 sm:pb-28">
          <p className="text-footnote text-subtle">Illustrative preview with demo listings. These rooms are not for rent.</p>
          <Link href="/find" className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-ink-2 active:scale-[0.97]">
            Open the finder <ArrowRight className="size-4" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </section>
  );
}

type Shown = (typeof DEMO_LISTINGS)[number] & { km: number };

function StoryMap({ shown, affordable, pick }: { shown: Shown[]; affordable: number; pick: Shown }) {
  return (
    <figure className="relative h-[50vh] min-h-[300px] overflow-hidden rounded-[28px] bg-[#f1ede5] ring-1 ring-limestone lg:h-[min(640px,calc(100dvh-48px))]">
      <figcaption className="sr-only">
        Illustrative map: a search around University of Mindanao with {shown.length} demo listings within 3 km, {affordable} of them at{" "}
        {formatPeso(BUDGET)} a month or less. The {pick.title.toLowerCase()} is selected, at {formatPeso(pick.monthlyPrice)} a month.
      </figcaption>

      <svg aria-hidden viewBox="0 0 700 520" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <g fill="#ebe5da">
          <rect x="40" y="40" width="150" height="110" rx="6" />
          <rect x="215" y="30" width="120" height="140" rx="6" />
          <rect x="470" y="60" width="180" height="120" rx="6" />
          <rect x="60" y="300" width="140" height="160" rx="6" />
          <rect x="420" y="330" width="200" height="140" rx="6" />
        </g>
        <path d="M-20 140 C 120 170, 210 120, 300 190 S 420 330, 520 300 S 650 380, 730 360" fill="none" stroke="#dbe6df" strokeWidth="26" strokeLinecap="round" />
        <g fill="none" stroke="#ffffff" strokeLinecap="round">
          <path d="M0 250 L700 230" strokeWidth="14" />
          <path d="M330 0 L360 520" strokeWidth="12" />
          <path d="M0 420 C 200 400, 420 470, 700 440" strokeWidth="9" />
          <path d="M120 0 L180 520" strokeWidth="7" />
          <path d="M560 0 L520 520" strokeWidth="7" />
          <path d="M0 90 L700 120" strokeWidth="6" />
        </g>
      </svg>

      {/* Search pill and budget chip */}
      <div aria-hidden className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-col items-start gap-2">
        <div data-s="pill" className="inline-flex h-11 items-center gap-2 rounded-full bg-white pr-5 pl-4 text-footnote font-medium text-ink shadow-md ring-1 ring-ink/5">
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={2} />
          <span data-s="pill-text" className="truncate">University of Mindanao, Matina</span>
        </div>
        <span data-s="budget" className="inline-flex h-9 items-center rounded-full bg-clay-soft px-3.5 text-footnote font-semibold text-clay ring-1 ring-clay/25">
          Up to {formatPeso(BUDGET)}
        </span>
      </div>

      {/* Distance ring around the search point: an HTML circle in the same coordinates as the pins */}
      <span
        aria-hidden
        data-s="ring"
        className="absolute aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-clay/55 bg-clay/[0.045]"
        style={pct(CENTRE.lat, CENTRE.lng)}
      />

      {/* Search point */}
      <span
        aria-hidden
        data-s="point"
        className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-[0_0_0_6px_rgb(32_42_40/0.14)]"
        style={pct(CENTRE.lat, CENTRE.lng)}
      />

      {/* Price pins, nearest first (the order they appear in). Final state: over-budget pins dimmed, the pick in clay */}
      {shown.map((l) => {
        const sel = l.id === pick.id;
        const over = l.monthlyPrice > BUDGET;
        return (
          <span
            key={l.id}
            aria-hidden
            data-pin
            data-over={over ? "" : undefined}
            data-sel={sel ? "" : undefined}
            className={cn(
              "be-story-pin absolute inline-flex h-[30px] -translate-x-1/2 -translate-y-full items-center rounded-full px-[11px] text-[13px] font-[650] whitespace-nowrap tabular-nums",
              "shadow-[0_2px_8px_-2px_rgb(32_42_40/0.24),0_0_0_1px_rgb(32_42_40/0.08)]",
              sel ? "z-10 bg-clay text-white" : "bg-white text-ink",
              over && "opacity-30",
            )}
            style={pct(l.lat, l.lng)}
          >
            {formatPesoShort(l.monthlyPrice)}
          </span>
        );
      })}

      {/* Result count: all rooms, then the ones within budget */}
      {/* Phones: the count sits beside the budget chip, clear of the pins and the room card */}
      <div aria-hidden className="absolute top-[60px] right-4 grid sm:top-auto sm:right-auto sm:bottom-4 sm:left-4">
        <span data-s="count-all" className="invisible col-start-1 row-start-1 inline-flex h-9 items-center self-start justify-self-end rounded-full bg-ink px-3.5 text-footnote font-semibold text-white sm:justify-self-start">
          {shown.length} rooms within 3 km
        </span>
        <span data-s="count-budget" className="col-start-1 row-start-1 inline-flex h-9 items-center self-start justify-self-end rounded-full bg-ink px-3.5 text-footnote font-semibold text-white sm:justify-self-start">
          {affordable} within your budget
        </span>
      </div>

      {/* The room behind the chosen price */}
      <div
        aria-hidden
        data-s="card"
        className="absolute right-4 bottom-4 grid w-[min(300px,calc(100%-2rem))] grid-cols-[96px_1fr] gap-3 rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-ink/5"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
          <Image src={`${pick.photos[0].src}.webp`} alt="" fill sizes="96px" loading="lazy" className="object-cover" />
        </div>
        <div className="min-w-0 py-0.5">
          <p className="text-callout font-semibold tabular-nums text-ink">
            {formatPeso(pick.monthlyPrice)} <span className="text-footnote font-normal text-subtle">/ month</span>
          </p>
          <p className="truncate text-footnote text-ink">{pick.title}</p>
          <p className="mt-0.5 text-caption text-subtle">
            {PROPERTY_TYPE_LABEL[pick.type]}, {formatKm(pick.km)}
          </p>
        </div>
      </div>
    </figure>
  );
}
