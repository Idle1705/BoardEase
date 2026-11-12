"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { EASE_OUT, gsap, reducedMotion, runMorphInto } from "@/lib/motion";
import { Bath, BedDouble, MapPin, Ruler, Users } from "lucide-react";
import { formatPeso } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import type { ListingResult } from "@/lib/search";
import { DemoBadge, FavoriteButton } from "./bits";
import { Gallery } from "./gallery";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function FeaturedListing({
  listing,
  onDetails,
  onContact,
  onClose,
  enter = false,
}: {
  listing: ListingResult;
  onDetails: () => void;
  onContact: () => void;
  /** Closes the card; the panel goes back to the plain grid */
  onClose?: () => void;
  /** True when a person opened the card (pin or card press), so it animates in on mount */
  enter?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  // Skip the entrance on page load (a shared link with ?id=), run it when someone opens the card
  const first = useRef(!enter);

  // Selected listing swap: text rises 8px, photo settles. Skipped on first paint and for reduced motion.
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reducedMotion() || !root.current) return;
    // Picked from a card: that card's photo flies into this frame (the screen's one authored moment).
    const morphed = runMorphInto(listing.id, root.current.querySelector<HTMLElement>("[data-featured-media]"));
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: EASE_OUT, stagger: 0.04, delay: morphed ? 0.12 : 0 },
      );
      if (!morphed) {
        // Picked on the map: the new photo resolves from a soft blur instead
        gsap.fromTo(
          "[data-photo]",
          { opacity: 0.3, filter: "blur(8px)", scale: 1.02 },
          { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.5, ease: EASE_OUT, clearProps: "filter" },
        );
      }
    }, root);
    return () => ctx.revert();
  }, [listing.id]);

  return (
    // Desktop panel: photo on the left, the facts and actions on the right
    <article ref={root} aria-labelledby="featured-title" className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] gap-5">
      <Gallery
        photos={listing.photos}
        sizes="300px"
        priority
        dataAttr="featured-media"
        expandTitle={listing.title}
        rounded="rounded-[20px]"
        className="aspect-[4/5] w-full self-start"
      >
        <div className="absolute top-3 left-3 flex gap-2">{listing.demo && <DemoBadge />}</div>
        <FavoriteButton id={listing.id} title={listing.title} className="absolute top-3 right-3" />
      </Gallery>

      <div className="flex min-w-0 flex-col gap-3 py-1">
        <div data-rise className={onClose ? "pr-12" : undefined}>
          <h2 id="featured-title" className="text-title3 font-semibold tracking-[-0.01em] text-balance text-ink">
            {listing.title}
          </h2>
          <p className="mt-1.5 flex items-start gap-1.5 text-footnote text-subtle">
            <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.9} />
            <span>
              {listing.street}, {listing.district}<span className="mt-0.5 block text-ink-2">{formatKm(listing.distanceKm)} away</span>
            </span>
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-surface px-3 py-2.5 text-footnote text-ink-2" data-rise aria-label="Room details">
          <Spec icon={BedDouble}>{PROPERTY_TYPE_LABEL[listing.type]}</Spec>
          <Spec icon={Users}>
            {listing.freeSpaces !== undefined
              ? `${listing.freeSpaces} ${listing.freeSpaces === 1 ? "space" : "spaces"} free`
              : listing.capacity === 1
                ? "1 person"
                : `${listing.capacity} people`}
          </Spec>
          <Spec icon={Bath}>{listing.bathroom === "private" ? "Own bath" : "Shared bath"}</Spec>
          {listing.sizeSqm && <Spec icon={Ruler}>{listing.sizeSqm} m²</Spec>}
        </ul>

        <p className="line-clamp-4 text-footnote leading-[1.45] text-ink-2" data-rise>
          {listing.description}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-1" data-rise>
          <p className="flex items-baseline gap-1.5">
            {listing.priceFrom && <span className="text-footnote text-subtle">from</span>}
            <span className="text-title2 font-semibold tabular-nums text-ink">{formatPeso(listing.monthlyPrice)}</span>
            <span className="text-footnote text-subtle">/ month</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDetails}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-clay px-4 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
            >
              View details
            </button>
            <button
              type="button"
              onClick={onContact}
              className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink ring-1 ring-black/12 transition-colors duration-150 hover:bg-surface active:scale-[0.97] active:bg-surface-2"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Spec({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className="size-4 text-subtle" strokeWidth={1.75} />
      {children}
    </li>
  );
}
