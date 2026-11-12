"use client";

import { useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import shotLocation from "../../../public/editorial/interface/finder-location.jpg";
import shotPrice from "../../../public/editorial/interface/finder-price.jpg";
import shotSpace from "../../../public/editorial/interface/finder-space.jpg";

/*
 * Product showcase: real screenshots of /find (demo listings, captured 2026-11-12 at 1440x900).
 * The reader picks a step; the next screenshot wipes in over the last one (CSS clip-path, 640ms).
 * Under reduced motion the swap is instant. On phones each shot is cropped to the part that matters.
 */
const STEPS: { key: string; title: string; body: string; shot: StaticImageData; alt: string; focus: string }[] = [
  {
    key: "location",
    title: "Location",
    body: "Start from your school or work, and set the distance.",
    shot: shotLocation,
    alt: "The BoardEase finder: a map of Matina centred on the University of Mindanao, a 3 km circle, and rooms shown as monthly prices",
    focus: "50% 55%",
  },
  {
    key: "price",
    title: "Monthly price",
    body: "Set a budget. Only rooms you can afford stay.",
    shot: shotPrice,
    alt: "The finder with a budget of up to ₱4,000: four demo rooms listed side by side with their monthly rent and distance",
    focus: "88% 60%",
  },
  {
    key: "space",
    title: "Rental space",
    body: "Bedspace, dorm or private room, and what is included.",
    shot: shotSpace,
    alt: "A demo private room opened in the finder: photo, room type, own bathroom, 14 square metres and ₱4,500 a month",
    focus: "78% 30%",
  },
];

export function FinderShowcase() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + STEPS.length) % STEPS.length;
    setActive(n);
    tabs.current[n]?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Steps: numbered hairline rows (architectural process columns, set vertically) */}
      <div className="lg:col-span-4" data-reveal>
        <div role="tablist" aria-orientation="vertical" aria-label="How renters compare" className="border-t border-ink/15">
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.key}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`show-tab-${s.key}`}
                aria-selected={on}
                aria-controls="show-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKey(e, i)}
                className="group grid w-full grid-cols-[3rem_1fr] gap-x-3 border-b border-ink/15 py-6 text-left outline-none focus-visible:bg-limestone/50"
              >
                <span
                  aria-hidden
                  className={cn(
                    "font-display text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums transition-colors duration-300",
                    on ? "text-clay" : "text-ink/25 group-hover:text-ink/45",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className={cn("block text-callout font-semibold transition-colors duration-300", on ? "text-ink" : "text-ink-2")}>{s.title}</span>
                  {/* Body stays in the layout (grid rows), so the list never jumps when a step opens */}
                  <span
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block max-w-[34ch] pt-2 text-body text-ink-2">{s.body}</span>
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Link
          href="/find"
          className="group mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
        >
          Explore rooms <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
        </Link>
      </div>

      <figure className="lg:col-span-8">
        <div
          data-scene="mask"
          id="show-panel"
          role="tabpanel"
          aria-labelledby={`show-tab-${STEPS[active].key}`}
          className="relative aspect-[4/3] overflow-hidden bg-limestone ring-1 ring-ink/10 sm:aspect-[1440/804]"
        >
          {STEPS.map((s, i) => (
            <Image
              key={s.key}
              src={s.shot}
              alt={i === active ? s.alt : ""}
              aria-hidden={i !== active}
              fill
              sizes="(min-width: 1024px) 820px, 100vw"
              placeholder="blur"
              style={{ ["--focus" as string]: s.focus }}
              className={cn("be-shot object-cover", i === active && "be-shot-on")}
            />
          ))}
        </div>
        <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-footnote text-subtle">
          <span>
            <span className="font-semibold text-ink">{STEPS[active].title}.</span> The BoardEase finder
          </span>
          <span>Demo listings, not for rent.</span>
        </figcaption>
      </figure>
    </div>
  );
}
