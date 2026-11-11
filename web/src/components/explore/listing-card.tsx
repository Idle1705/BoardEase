"use client";

import { forwardRef, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatPeso } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import type { ListingResult } from "@/lib/search";
import { setMorphSource } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DemoBadge, FavoriteButton } from "./bits";

type Props = {
  listing: ListingResult;
  selected: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
  className?: string;
  layout?: "rail" | "grid";
};

export const ListingCard = forwardRef<HTMLLIElement, Props>(function ListingCard(
  { listing, selected, onSelect, onHover, className, layout = "rail" },
  ref,
) {
  const [broken, setBroken] = useState(false);
  const media = useRef<HTMLDivElement>(null);
  const photo = listing.photos[0];
  return (
    <li
      ref={ref}
      data-flip-id={listing.id}
      className={cn("group/card relative snap-start", layout === "rail" ? "w-[232px] shrink-0" : "w-full", className)}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-[box-shadow,transform] duration-200 ease-[var(--ease-out-soft)]",
          "group-hover/card:-translate-y-0.5 group-hover/card:shadow-md group-active/card:scale-[0.98]",
          selected && "shadow-md ring-2 ring-clay",
        )}
      >
        <div ref={media} data-card-media className={cn("relative overflow-hidden bg-surface", layout === "rail" ? "aspect-[16/10]" : "aspect-[16/10]")}>
          {photo && !broken ? (
            <Image
              src={`${photo.src}.webp`}
              alt={photo.alt}
              fill
              sizes={layout === "rail" ? "232px" : "(min-width: 1024px) 340px, (min-width: 768px) 50vw, 100vw"}
              className="object-cover transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover/card:scale-[1.03]"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-subtle">
              <ImageOff className="size-5" strokeWidth={1.5} aria-label="Photo not available" />
            </div>
          )}
          {listing.demo && <DemoBadge className="absolute top-2 left-2" />}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 px-3 pt-2.5 pb-3">
          <p className="text-callout font-semibold tabular-nums text-ink">
            {formatPeso(listing.monthlyPrice)}
            <span className="text-footnote font-normal text-subtle"> / month</span>
          </p>
          {/* The title is the card's one link-like target; the overlay button makes the whole card clickable */}
          <h3 className="line-clamp-2 text-body leading-snug font-medium text-ink">
            <button
              type="button"
              onClick={() => {
                if (!selected) setMorphSource(listing.id, media.current?.querySelector("img") ?? null);
                onSelect();
              }}
              onFocus={() => onHover(true)}
              onBlur={() => onHover(false)}
              aria-pressed={selected}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand"
            >
              {listing.title}
            </button>
          </h3>
          <p className="flex items-center justify-between gap-2 text-footnote text-subtle">
            <span className="truncate">{PROPERTY_TYPE_LABEL[listing.type]}</span>
            <span className="shrink-0 tabular-nums">{formatKm(listing.distanceKm)}</span>
          </p>
        </div>
      </div>
      <FavoriteButton id={listing.id} title={listing.title} size="sm" className="absolute top-2 right-2 z-10" />
    </li>
  );
});
