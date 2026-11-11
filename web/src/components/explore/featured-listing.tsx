"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
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
}: {
  listing: ListingResult;
  onDetails: () => void;
  onContact: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Selected listing swap: text rises 8px, photo settles. Skipped on first paint and for reduced motion.
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-rise]", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "power2.out", stagger: 0.03 });
      gsap.fromTo("[data-photo]", { opacity: 0.4, scale: 1.015 }, { opacity: 1, scale: 1, duration: 0.36, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, [listing.id]);

  return (
    <article ref={root} aria-labelledby="featured-title" className="flex flex-col gap-3.5">
      <Gallery
        photos={listing.photos}
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="aspect-[16/10] w-full lg:aspect-auto lg:h-[clamp(200px,28vh,340px)]"
      >
        <div className="absolute top-3 left-3 flex gap-2">
          {listing.demo && <DemoBadge />}
        </div>
        <FavoriteButton id={listing.id} title={listing.title} className="absolute top-3 right-3" />
      </Gallery>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0" data-rise>
          <h2 id="featured-title" className="text-title3 font-semibold tracking-[-0.01em] text-ink lg:text-title2">
            {listing.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-footnote text-subtle">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.9} />
            <span className="truncate">
              {listing.street}, {listing.district}
            </span>
            <span className="shrink-0 text-ink-2">{formatKm(listing.distanceKm)} away</span>
          </p>
        </div>
        <p className="shrink-0 text-right" data-rise>
          <span className="block text-title3 font-semibold tabular-nums text-ink lg:text-title2">
            {formatPeso(listing.monthlyPrice)}
          </span>
          <span className="text-footnote text-subtle">per month</span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-footnote text-ink-2" data-rise aria-label="Room details">
        <Spec icon={BedDouble}>{PROPERTY_TYPE_LABEL[listing.type]}</Spec>
        <Spec icon={Users}>{listing.capacity === 1 ? "For 1 person" : `For ${listing.capacity} people`}</Spec>
        <Spec icon={Bath}>{listing.bathroom === "private" ? "Own bathroom" : "Shared bathroom"}</Spec>
        {listing.sizeSqm && <Spec icon={Ruler}>{listing.sizeSqm} m²</Spec>}
      </ul>

      <p className="line-clamp-2 max-w-[62ch] text-body text-ink-2" data-rise>
        {listing.description}
      </p>

      <div className="flex items-center justify-between gap-4" data-rise>
        <p className="min-w-0 truncate text-footnote text-subtle">
          <span className="sr-only">Amenities: </span>
          {listing.amenities.slice(0, 3).join(", ")}
          {listing.amenities.length > 3 && `, and ${listing.amenities.length - 3} more`}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onContact}
            className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink ring-1 ring-black/12 transition-colors duration-150 hover:bg-surface active:bg-surface-2"
          >
            Contact owner
          </button>
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-body font-medium text-white transition-colors duration-150 hover:bg-ink-2 active:translate-y-px"
          >
            View details
          </button>
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
