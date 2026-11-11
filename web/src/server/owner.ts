import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "./db";

const { properties, rooms, tenancies, inquiries } = schema;

/*
 * Owner portal data. Every query is scoped by ownerId taken from the server session
 * (requireRole in the caller), never from anything the browser sends.
 * Availability is per bed: free = capacity - active tenancies in that room. One full room
 * never makes the whole property look full.
 */

export type RoomRow = {
  id: string;
  propertyId: string;
  label: string;
  kind: "single" | "shared" | "unit";
  capacity: number;
  occupied: number;
  free: number;
  rentCents: number;
};

export type PropertyRow = {
  id: string;
  name: string;
  street: string;
  district: string;
  city: string;
  rooms: RoomRow[];
  capacity: number;
  occupied: number;
  free: number;
};

export async function getOwnerInventory(ownerId: string): Promise<PropertyRow[]> {
  const db = getDb();
  const props = await db
    .select({ id: properties.id, name: properties.name, street: properties.street, district: properties.district, city: properties.city })
    .from(properties)
    .where(eq(properties.ownerId, ownerId))
    .orderBy(asc(properties.name));
  if (!props.length) return [];

  const roomRows = await db
    .select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      label: rooms.label,
      kind: rooms.kind,
      capacity: rooms.capacity,
      rentCents: rooms.baseRentCents,
    })
    .from(rooms)
    .where(and(eq(rooms.ownerId, ownerId), inArray(rooms.propertyId, props.map((p) => p.id))))
    .orderBy(asc(rooms.label));

  const occupiedRows = roomRows.length
    ? await db
        .select({ roomId: tenancies.roomId, n: sql<number>`count(*)::int` })
        .from(tenancies)
        .where(and(eq(tenancies.ownerId, ownerId), isNull(tenancies.endDate), inArray(tenancies.roomId, roomRows.map((r) => r.id))))
        .groupBy(tenancies.roomId)
    : [];
  const occupiedBy = new Map(occupiedRows.map((r) => [r.roomId, r.n]));

  return props.map((p) => {
    const rs: RoomRow[] = roomRows
      .filter((r) => r.propertyId === p.id)
      .map((r) => {
        const occupied = Math.min(occupiedBy.get(r.id) ?? 0, r.capacity);
        return { ...r, occupied, free: r.capacity - occupied };
      });
    const capacity = rs.reduce((a, r) => a + r.capacity, 0);
    const occupied = rs.reduce((a, r) => a + r.occupied, 0);
    return { ...p, rooms: rs, capacity, occupied, free: capacity - occupied };
  });
}

export async function countNewInquiries(ownerId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(and(eq(inquiries.ownerId, ownerId), eq(inquiries.status, "new")));
  return row?.n ?? 0;
}

/** True only when the property exists and belongs to this owner. */
export async function ownsProperty(ownerId: string, propertyId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, ownerId)))
    .limit(1);
  return !!row;
}

/**
 * Finds the street in Davao City for the property's public map point, then moves it by a random
 * 80 to 180 m so the public map never shows the exact building (schema: publicLat/publicLng).
 */
export async function locateStreet(street: string, district: string, city: string) {
  const base = process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";
  const url = new URL(base);
  url.searchParams.set("q", `${street}, ${district}, ${city}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ph");
  const res = await fetch(url, {
    headers: { "User-Agent": process.env.GEOCODER_USER_AGENT ?? "BoardEase/0.1 (rental search, development)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("geocoder");
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  const metres = 80 + Math.random() * 100;
  const angle = Math.random() * Math.PI * 2;
  const dLat = (metres * Math.cos(angle)) / 111_320;
  const dLng = (metres * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { exactLat: lat, exactLng: lng, publicLat: lat + dLat, publicLng: lng + dLng };
}
