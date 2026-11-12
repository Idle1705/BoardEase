import "server-only";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import type { PublicListing } from "@/lib/listing-types";
import { getDb } from "../db";
import { photoUrl } from "../storage";
import { listPublicListings, type PublicListingRow } from "./core";

/** Demo listings appear only when the server is told to show them, and are always badged as demos. */
export const demoListingsEnabled = () => process.env.BOARDEASE_DEMO_LISTINGS === "1";

/** A live listing in the shape the finder's map, cards and panel use. Public fields only. */
export function toFinderListing(r: PublicListingRow): PublicListing {
  return {
    id: r.id,
    demo: false,
    title: r.title,
    type: r.type,
    street: r.street,
    district: r.district,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    locationPrecision: "approximate",
    monthlyPrice: Math.round(r.priceFromCents / 100),
    capacity: r.freeSpaces,
    bathroom: r.bathroom,
    furnished: r.furnished,
    utilities: r.utilitiesNote || "Ask the owner what bills are included.",
    minimumStayMonths: r.minimumStayMonths,
    amenities: r.amenities,
    description: r.description,
    // The finder appends ".webp"; stored keys already end in it
    photos: r.photos.map((p) => ({ src: photoUrl(p.key).replace(/\.webp$/, ""), alt: p.alt, width: p.width, height: p.height })),
    freeSpaces: r.freeSpaces,
    priceFrom: r.rooms.filter((x) => x.free > 0).length > 1,
    href: `/listings/${r.id}`,
  };
}

export async function getFinderListings(): Promise<PublicListing[]> {
  const real = (await listPublicListings(getDb())).map(toFinderListing);
  return demoListingsEnabled() ? [...real, ...DEMO_LISTINGS] : real;
}
