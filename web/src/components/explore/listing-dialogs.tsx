"use client";

import { Bath, BedDouble, CalendarClock, Info, MapPin, Ruler, Sofa, Users, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatPeso } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import type { ListingResult } from "@/lib/search";
import { DemoBadge, FavoriteButton } from "./bits";
import { Gallery } from "./gallery";

export function ListingDetailsDialog({
  listing,
  open,
  onOpenChange,
  onContact,
}: {
  listing: ListingResult | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onContact: () => void;
}) {
  if (!listing) return null;
  const facts: [React.ComponentType<{ className?: string; strokeWidth?: number }>, string][] = [
    [BedDouble, PROPERTY_TYPE_LABEL[listing.type]],
    [Users, listing.capacity === 1 ? "For 1 person" : `For ${listing.capacity} people`],
    [Bath, listing.bathroom === "private" ? "Own bathroom" : "Shared bathroom"],
    [Sofa, listing.furnished ? "Furnished" : "Unfurnished"],
    ...(listing.sizeSqm ? [[Ruler, `${listing.sizeSqm} m²`] as [typeof Ruler, string]] : []),
    [CalendarClock, `Minimum stay ${listing.minimumStayMonths} months`],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The close button sits on the photo: give it the same white disc as the save button so it stays visible on light photos */}
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-y-auto rounded-xl p-0 sm:max-w-2xl [&>*]:shrink-0 [&>[data-slot=dialog-close]]:top-3 [&>[data-slot=dialog-close]]:right-3 [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:size-10 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-white/95 [&>[data-slot=dialog-close]]:text-ink [&>[data-slot=dialog-close]]:shadow-md [&>[data-slot=dialog-close]]:hover:bg-white" showCloseButton>
        <Gallery photos={listing.photos} sizes="(min-width: 640px) 672px, 100vw" rounded="rounded-none" className="aspect-[16/10] w-full" expandTitle={listing.title}>
          <div className="absolute top-3 left-3">{listing.demo && <DemoBadge />}</div>
          <FavoriteButton id={listing.id} title={listing.title} className="absolute top-3 right-[60px]" />
        </Gallery>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {listing.demo && (
            <p className="flex gap-2 rounded-md bg-[#fdf6e7] px-3 py-2.5 text-footnote text-warn">
              <Info className="mt-0.5 size-4 shrink-0" />
              This is a demonstration listing. The room, price and owner are invented to show how BoardEase works, and the photos show other places.
            </p>
          )}
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-title2 font-semibold tracking-[-0.01em]">{listing.title}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-1.5 text-footnote text-subtle">
                <MapPin className="size-3.5" />
                {listing.street}, {listing.district}. {formatKm(listing.distanceKm)} from your search
              </DialogDescription>
            </div>
            <p className="shrink-0 text-right">
              <span className="block text-title2 font-semibold tabular-nums">{formatPeso(listing.monthlyPrice)}</span>
              <span className="text-footnote text-subtle">per month</span>
            </p>
          </div>

          <p className="text-body text-ink-2">{listing.description}</p>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {facts.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-2 text-footnote text-ink-2">
                <Icon className="size-4 text-subtle" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>

          <div>
            <h3 className="text-callout font-semibold">Bills</h3>
            <p className="mt-1 flex items-start gap-2 text-body text-ink-2">
              <Zap className="mt-1 size-4 shrink-0 text-subtle" strokeWidth={1.75} />
              {listing.utilities}
            </p>
          </div>

          <div>
            <h3 className="text-callout font-semibold">What the place has</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {listing.amenities.map((a) => (
                <li key={a} className="rounded-sm bg-surface px-2.5 py-1 text-footnote text-ink-2">
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-footnote text-subtle">
            The map shows the approximate area only. Owners share the exact address once a viewing is agreed.
          </p>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-hairline bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <button
              type="button"
              onClick={onContact}
              className="inline-flex h-11 items-center rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
            >
              Contact owner
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ContactDialog({
  listing,
  open,
  onOpenChange,
}: {
  listing: ListingResult | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!listing) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl p-6 sm:max-w-md">
        <DialogTitle className="text-title3 font-semibold">
          {listing.demo ? "This demo listing has no owner" : `Contact the owner of ${listing.title}`}
        </DialogTitle>
        <DialogDescription className="text-body text-ink-2">
          {listing.demo
            ? "Demo listings show how the search works, so there is nobody to message. Inquiries and viewing requests open when owners publish real rooms, and you will need a free renter account to send one."
            : "Sign in to send the owner a message or ask for a viewing."}
        </DialogDescription>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-body font-medium text-white hover:bg-ink-2"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
