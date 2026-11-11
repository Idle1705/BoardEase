"use client";

import Image from "next/image";
import Link from "next/link";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { useFavorites } from "@/hooks/use-favorites";
import { formatPeso } from "@/lib/format";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { DemoBadge, FavoriteButton } from "@/components/explore/bits";

export function SavedList() {
  const { saved } = useFavorites();
  const items = DEMO_LISTINGS.filter((l) => saved.includes(l.id));
  if (!items.length) {
    return (
      <div className="rounded-xl bg-surface p-6">
        <p className="font-medium text-ink">Nothing saved yet</p>
        <p className="mt-1">Tap the heart on a listing to keep it here.</p>
        <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-md bg-ink px-4 font-medium text-white hover:bg-ink-2">
          Browse rooms
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((l) => (
        <li key={l.id} className="relative flex gap-4 rounded-lg bg-white p-3 shadow-sm">
          <div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-md bg-surface">
            <Image src={`${l.photos[0].src}.webp`} alt={l.photos[0].alt} fill sizes="128px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 py-1">
            {l.demo && <DemoBadge className="mb-1 bg-surface shadow-none" />}
            <p className="truncate font-medium text-ink">
              <Link href={`/?id=${l.id}`} className="after:absolute after:inset-0">
                {l.title}
              </Link>
            </p>
            <p className="text-footnote text-subtle">
              {PROPERTY_TYPE_LABEL[l.type]}, {l.district}
            </p>
            <p className="mt-1 font-semibold tabular-nums text-ink">{formatPeso(l.monthlyPrice)} / month</p>
          </div>
          <FavoriteButton id={l.id} title={l.title} size="sm" className="relative z-10 self-start" />
        </li>
      ))}
    </ul>
  );
}
