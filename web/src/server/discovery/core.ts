/*
 * Discovery server logic (docs/web/DISCOVERY-FEASIBILITY.md). Every function that changes data takes the
 * acting user explicitly, so authorization is tested directly (discovery.integration.test.ts).
 * Public reads select public columns only: never exact addresses, renter ids or contact details.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { externalVerification, firstPartyVerification, normalizeUrl, type DiscoveryItem } from "@/lib/discovery";
import type { DiscoveryDb } from "./db";
import * as s from "../db/schema";

export type Actor = { id: string; role: "renter" | "owner" | "admin" };
export class DiscoveryError extends Error {}

const DAY = 86_400_000;
export const EXTERNAL_CHECK_DAYS = 14;
export const REQUEST_DAYS = 30;

const BUILDING_TYPE: Record<string, string> = {
  dormitory: "dormitory",
  boarding_house: "boarding-house",
  apartment_building: "apartment",
  condominium: "condominium",
  house: "house",
  mixed_use: "apartment",
  other: "apartment",
};

/* ---------------------------------------------------------------- Public discovery read */

export async function listDiscoveryItems(db: DiscoveryDb, now = new Date(), opts: { includeUnreviewedDirectory?: boolean } = {}): Promise<DiscoveryItem[]> {
  // 1. BoardEase listings (published + approved), public point only, with the latest availability check
  const own = await db
    .select({
      id: s.listings.id,
      title: s.listings.title,
      type: s.listings.type,
      priceCents: s.listings.monthlyPriceCents,
      term: s.listings.rentalTerm,
      bedrooms: s.listings.bedrooms,
      furnished: s.listings.furnished,
      capacity: s.rooms.capacity,
      district: s.properties.district,
      lat: s.properties.publicLat,
      lng: s.properties.publicLng,
      propertyId: s.properties.id,
    })
    .from(s.listings)
    .innerJoin(s.rooms, eq(s.rooms.id, s.listings.roomId))
    .innerJoin(s.properties, eq(s.properties.id, s.rooms.propertyId))
    .where(and(eq(s.listings.status, "published"), eq(s.listings.moderation, "approved")));

  const ids = own.map((o) => o.id);
  const checks = ids.length
    ? await db
        .select()
        .from(s.availabilityChecks)
        .where(inArray(s.availabilityChecks.listingId, ids))
        .orderBy(desc(s.availabilityChecks.checkedAt))
    : [];
  const links = own.length
    ? await db.select().from(s.propertyBuildingLinks).where(inArray(s.propertyBuildingLinks.propertyId, own.map((o) => o.propertyId)))
    : [];
  const boardease = { key: "boardease", name: "BoardEase", attribution: "Listed on BoardEase by the owner" };

  const items: DiscoveryItem[] = [];
  for (const o of own) {
    const latest = checks.find((c) => c.listingId === o.id);
    const v = firstPartyVerification(
      latest ? { result: latest.result, method: latest.method, checkedAt: latest.checkedAt.toISOString(), freeBeds: latest.freeBeds } : null,
      now,
    );
    if (!v) continue; // latest check says unavailable: not a result
    items.push({
      kind: "listing",
      id: o.id,
      title: o.title,
      lat: o.lat,
      lng: o.lng,
      district: o.district,
      propertyType: o.type,
      priceCents: o.priceCents,
      rentalTerm: o.term,
      bedrooms: o.bedrooms,
      bedspaces: o.capacity,
      furnished: o.furnished,
      buildingId: links.find((l) => l.propertyId === o.propertyId)?.buildingId ?? null,
      source: boardease,
      verification: v,
      url: null,
    });
  }

  // 2. External references that were published (stale ones come back flagged, the rules decide what shows)
  const ext = await db
    .select({ e: s.externalListings, src: s.sources })
    .from(s.externalListings)
    .innerJoin(s.sources, eq(s.sources.id, s.externalListings.sourceId))
    .where(inArray(s.externalListings.status, ["published", "stale"]));
  const buildingPoints = await db.select({ id: s.buildings.id, lat: s.buildings.lat, lng: s.buildings.lng }).from(s.buildings);
  for (const { e, src } of ext) {
    const point = e.lat != null && e.lng != null ? { lat: e.lat, lng: e.lng } : buildingPoints.find((b) => b.id === e.buildingId);
    if (!point) continue; // no location, cannot be placed on the map
    items.push({
      kind: "external",
      id: e.id,
      title: e.title,
      lat: point.lat,
      lng: point.lng,
      district: e.district,
      propertyType: e.propertyType,
      priceCents: e.advertisedPriceCents,
      rentalTerm: e.rentalTerm,
      bedrooms: e.bedrooms,
      bedspaces: e.bedspaces,
      furnished: e.furnished,
      buildingId: e.buildingId,
      source: { key: src.key, name: src.name, attribution: src.attribution },
      verification: externalVerification(e.lastCheckedAt?.toISOString() ?? null, e.expiresAt.toISOString(), now),
      url: e.url,
    });
  }

  // 3. Directory buildings (context only, never rentable)
  const dir = await db
    .select({ b: s.buildings, src: s.sources })
    .from(s.buildings)
    .innerJoin(s.sources, eq(s.sources.id, s.buildings.sourceId))
    .where(opts.includeUnreviewedDirectory ? inArray(s.buildings.status, ["active", "unverified"]) : eq(s.buildings.status, "active"));
  for (const { b, src } of dir) {
    items.push({
      kind: "building",
      id: b.id,
      title: b.name,
      lat: b.lat,
      lng: b.lng,
      district: b.district,
      propertyType: BUILDING_TYPE[b.kind] ?? "apartment",
      priceCents: null,
      rentalTerm: null,
      bedrooms: null,
      bedspaces: null,
      furnished: null,
      buildingId: b.id,
      source: { key: src.key, name: src.name, attribution: src.attribution },
      verification: { state: "directory" },
      url: null,
    });
  }
  return items;
}

/** Marks published references whose check window has passed as stale (run on a schedule). */
export async function markStaleExternal(db: DiscoveryDb, now = new Date()) {
  const rows = await db
    .update(s.externalListings)
    .set({ status: "stale", updatedAt: now })
    .where(and(eq(s.externalListings.status, "published"), sql`${s.externalListings.expiresAt} <= ${now.toISOString()}`))
    .returning({ id: s.externalListings.id });
  return rows.length;
}

/* ---------------------------------------------------------------- Advertiser-submitted references */

export async function submitExternalReference(
  db: DiscoveryDb,
  actor: Actor,
  input: { url: string; title: string; propertyType: string; district: string; priceCents: number | null; buildingId?: string; consent: boolean },
  now = new Date(),
) {
  if (!input.consent) throw new DiscoveryError("Confirm that you posted this advert yourself, or manage the property.");
  if (!/^https:\/\//.test(input.url)) throw new DiscoveryError("Use the full https:// link to your advert.");
  const [src] = await db.select().from(s.sources).where(eq(s.sources.key, "advertiser-submitted")).limit(1);
  if (!src) throw new DiscoveryError("Advertiser submissions are not open yet.");
  const normalized = normalizeUrl(input.url);
  const [dup] = await db.select({ id: s.externalListings.id }).from(s.externalListings).where(eq(s.externalListings.normalizedUrl, normalized)).limit(1);
  if (dup) throw new DiscoveryError("This advert is already on BoardEase.");
  const [row] = await db
    .insert(s.externalListings)
    .values({
      sourceId: src.id,
      buildingId: input.buildingId ?? null,
      normalizedUrl: normalized,
      url: input.url,
      title: input.title,
      propertyType: input.propertyType,
      district: input.district,
      advertisedPriceCents: input.priceCents,
      submittedBy: actor.id,
      status: "pending_review", // a moderator publishes it
      expiresAt: new Date(now.getTime() + EXTERNAL_CHECK_DAYS * DAY),
    })
    .returning({ id: s.externalListings.id });
  return row.id;
}

/* ---------------------------------------------------------------- Owner claims */

export async function submitClaim(
  db: DiscoveryDb,
  actor: Actor,
  input: { buildingId: string; role: "owner" | "manager"; scope: string; evidenceKeys: string[]; evidenceNote?: string },
) {
  if (actor.role !== "owner" && actor.role !== "admin") throw new DiscoveryError("Only owner accounts can claim a property.");
  if (!input.evidenceKeys.length) throw new DiscoveryError("Add at least one document that shows you own or manage it.");
  if (!input.scope.trim()) throw new DiscoveryError("Say what you own or manage, e.g. a unit number or the whole building.");
  const [b] = await db.select({ id: s.buildings.id, status: s.buildings.status }).from(s.buildings).where(eq(s.buildings.id, input.buildingId)).limit(1);
  if (!b || b.status === "rejected" || b.status === "closed") throw new DiscoveryError("This building can't be claimed.");
  try {
    const [row] = await db
      .insert(s.propertyClaims)
      .values({
        buildingId: input.buildingId,
        claimantId: actor.id,
        role: input.role,
        scope: input.scope.trim(),
        evidenceKeys: input.evidenceKeys,
        evidenceNote: input.evidenceNote ?? null,
      })
      .returning({ id: s.propertyClaims.id, status: s.propertyClaims.status });
    return row;
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code ?? (e as Error).message).includes("23505"))
      throw new DiscoveryError("You already have a claim waiting for this.");
    throw e;
  }
}

/** Admin only. Approval links one of the CLAIMANT's own properties to the building; nothing else changes hands. */
export async function decideClaim(
  db: DiscoveryDb,
  actor: Actor,
  input: { claimId: string; approve: boolean; propertyId?: string; note: string },
  now = new Date(),
) {
  if (actor.role !== "admin") throw new DiscoveryError("Only a BoardEase moderator can decide claims.");
  const [claim] = await db.select().from(s.propertyClaims).where(eq(s.propertyClaims.id, input.claimId)).limit(1);
  if (!claim || claim.status !== "pending") throw new DiscoveryError("This claim is not waiting for a decision.");
  if (claim.claimantId === actor.id) throw new DiscoveryError("A moderator can't approve their own claim.");
  if (input.approve) {
    if (!input.propertyId) throw new DiscoveryError("Pick the claimant's property to link.");
    const [p] = await db.select({ ownerId: s.properties.ownerId }).from(s.properties).where(eq(s.properties.id, input.propertyId)).limit(1);
    if (!p || p.ownerId !== claim.claimantId) throw new DiscoveryError("That property doesn't belong to the claimant.");
    await db
      .insert(s.propertyBuildingLinks)
      .values({ propertyId: input.propertyId, buildingId: claim.buildingId, claimId: claim.id })
      .onConflictDoUpdate({ target: s.propertyBuildingLinks.propertyId, set: { buildingId: claim.buildingId, claimId: claim.id } });
  }
  const [row] = await db
    .update(s.propertyClaims)
    .set({ status: input.approve ? "approved" : "rejected", reviewedBy: actor.id, decisionNote: input.note, decidedAt: now })
    .where(eq(s.propertyClaims.id, claim.id))
    .returning({ status: s.propertyClaims.status });
  return row;
}

/* ---------------------------------------------------------------- Renter requests */

export async function createRenterRequest(
  db: DiscoveryDb,
  actor: Actor,
  input: { district: string; maxBudget: number; propertyType: string; moveIn: string; amenities: string[]; note?: string },
  now = new Date(),
) {
  if (!(input.maxBudget > 0)) throw new DiscoveryError("Enter your monthly budget.");
  const [row] = await db
    .insert(s.renterRequests)
    .values({
      renterId: actor.id,
      district: input.district,
      maxBudgetCents: Math.round(input.maxBudget * 100),
      propertyType: input.propertyType,
      moveIn: input.moveIn,
      amenities: input.amenities,
      note: input.note ?? null,
      expiresAt: new Date(now.getTime() + REQUEST_DAYS * DAY),
    })
    .returning({ id: s.renterRequests.id });
  return row.id;
}

/** What owners see: no renter id, no name, no contact, no free-text note (it could contain a phone number). */
export async function listOpenRequests(db: DiscoveryDb, actor: Actor, now = new Date()) {
  if (actor.role !== "owner" && actor.role !== "admin") throw new DiscoveryError("Only owners can see renter requests.");
  return db
    .select({
      id: s.renterRequests.id,
      district: s.renterRequests.district,
      maxBudgetCents: s.renterRequests.maxBudgetCents,
      propertyType: s.renterRequests.propertyType,
      moveIn: s.renterRequests.moveIn,
      amenities: s.renterRequests.amenities,
    })
    .from(s.renterRequests)
    .where(and(eq(s.renterRequests.status, "open"), sql`${s.renterRequests.expiresAt} > ${now.toISOString()}`));
}

export async function respondToRequest(db: DiscoveryDb, actor: Actor, input: { requestId: string; message: string; listingId?: string }) {
  if (actor.role !== "owner" && actor.role !== "admin") throw new DiscoveryError("Only owners can answer renter requests.");
  if (input.listingId) {
    const [l] = await db.select({ ownerId: s.listings.ownerId }).from(s.listings).where(eq(s.listings.id, input.listingId)).limit(1);
    if (!l || l.ownerId !== actor.id) throw new DiscoveryError("You can only suggest your own listings.");
  }
  const [row] = await db
    .insert(s.requestResponses)
    .values({ requestId: input.requestId, ownerId: actor.id, listingId: input.listingId ?? null, message: input.message })
    .returning({ id: s.requestResponses.id });
  return row.id;
}

/** A thread is readable only by the renter who asked and the owner who answered. */
async function participants(db: DiscoveryDb, responseId: string) {
  const [r] = await db
    .select({ ownerId: s.requestResponses.ownerId, renterId: s.renterRequests.renterId })
    .from(s.requestResponses)
    .innerJoin(s.renterRequests, eq(s.renterRequests.id, s.requestResponses.requestId))
    .where(eq(s.requestResponses.id, responseId))
    .limit(1);
  return r;
}

export async function readThread(db: DiscoveryDb, actor: Actor, responseId: string) {
  const p = await participants(db, responseId);
  if (!p || (actor.id !== p.ownerId && actor.id !== p.renterId)) throw new DiscoveryError("You can't read this conversation.");
  return db
    .select({ id: s.requestMessages.id, mine: sql<boolean>`${s.requestMessages.senderId} = ${actor.id}`, body: s.requestMessages.body, at: s.requestMessages.createdAt })
    .from(s.requestMessages)
    .where(eq(s.requestMessages.responseId, responseId))
    .orderBy(s.requestMessages.createdAt);
}

export async function sendMessage(db: DiscoveryDb, actor: Actor, responseId: string, body: string) {
  const p = await participants(db, responseId);
  if (!p || (actor.id !== p.ownerId && actor.id !== p.renterId)) throw new DiscoveryError("You can't post in this conversation.");
  if (!body.trim()) throw new DiscoveryError("Write a message first.");
  await db.insert(s.requestMessages).values({ responseId, senderId: actor.id, body: body.trim() });
}

