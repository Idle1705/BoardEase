import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { PublicListing } from "@/lib/listing-types";
import { getDb, schema } from "./db";

const { listings, listingPhotos, properties } = schema;

/**
 * Published, approved listings for the public map.
 * Selects public columns only: never exact addresses, exact coordinates, owner ids or anything
 * from the management tables.
 */
export async function getPublishedListings(photoBaseUrl: string): Promise<PublicListing[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      type: listings.type,
      monthlyPriceCents: listings.monthlyPriceCents,
      bathroom: listings.bathroom,
      sizeSqm: listings.sizeSqm,
      furnished: listings.furnished,
      utilities: listings.utilitiesNote,
      minimumStayMonths: listings.minimumStayMonths,
      amenities: listings.amenities,
      street: properties.street,
      district: properties.district,
      city: properties.city,
      lat: properties.publicLat,
      lng: properties.publicLng,
    })
    .from(listings)
    .innerJoin(schema.rooms, eq(schema.rooms.id, listings.roomId))
    .innerJoin(properties, eq(properties.id, schema.rooms.propertyId))
    .where(and(eq(listings.status, "published"), eq(listings.moderation, "approved")));

  if (!rows.length) return [];
  const photos = await db
    .select({
      listingId: listingPhotos.listingId,
      key: listingPhotos.storageKey,
      width: listingPhotos.width,
      height: listingPhotos.height,
      alt: listingPhotos.alt,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, rows.map((r) => r.id)))
    .orderBy(asc(listingPhotos.position));

  return rows.map((r) => ({
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
    monthlyPrice: Math.round(r.monthlyPriceCents / 100),
    capacity: 1,
    bathroom: r.bathroom,
    sizeSqm: r.sizeSqm ?? undefined,
    furnished: r.furnished,
    utilities: r.utilities,
    minimumStayMonths: r.minimumStayMonths,
    amenities: r.amenities,
    description: r.description,
    photos: photos
      .filter((p) => p.listingId === r.id)
      .map((p) => ({ src: `${photoBaseUrl}/${p.key}`, alt: p.alt, width: p.width, height: p.height })),
  }));
}
