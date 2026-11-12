/*
 * Marketplace server logic (docs/web/MARKETPLACE.md): owner listings, the review lifecycle, photos,
 * the public finder read, renter inquiries, reports and admin review.
 *
 * Every function that reads private data or changes anything takes the acting user explicitly and
 * checks ownership here, on the server, so authorization is tested directly
 * (marketplace.integration.test.ts). Public reads select public columns only: never exact
 * addresses, exact coordinates, owner emails, renter ids or renter phone numbers.
 */
import { and, asc, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import {
  INQUIRIES_PER_HOUR,
  INQUIRY_MAX,
  INQUIRY_MIN,
  MAX_PHOTOS,
  MESSAGES_PER_HOUR,
  canMove,
  isComplete,
  isFresh,
  looksLikeSpam,
  publicationChecklist,
  roomSpaces,
  type ListingStatus,
  type RoomKind,
} from "@/lib/marketplace";
import type { PropertyType } from "@/lib/listing-types";
import type { getDb } from "../db";
import * as s from "../db/schema";

export type Db = ReturnType<typeof getDb>;
export type Actor = { id: string; role: "renter" | "owner" | "admin" };
export class MarketError extends Error {}

const HOUR = 3_600_000;
const fail = (m: string): never => {
  throw new MarketError(m);
};

/* ---------------------------------------------------------------- Inventory and availability */

export type RoomAvailability = {
  id: string;
  label: string;
  kind: RoomKind;
  capacity: number;
  rentCents: number;
  tenancies: number;
  takenManual: number;
  basis: "bed" | "room" | "unit";
  total: number;
  free: number;
};

/** Rooms of these properties with real availability: tenancies + owner-marked beds are both "taken". */
async function roomsWithAvailability(db: Db, propertyIds: string[]) {
  if (!propertyIds.length) return new Map<string, RoomAvailability[]>();
  const rows = await db
    .select({
      id: s.rooms.id,
      propertyId: s.rooms.propertyId,
      label: s.rooms.label,
      kind: s.rooms.kind,
      capacity: s.rooms.capacity,
      rentCents: s.rooms.baseRentCents,
      takenManual: s.rooms.takenManual,
      tenancies: sql<number>`(select count(*)::int from ${s.tenancies} t where t.room_id = ${s.rooms.id} and t.end_date is null)`,
    })
    .from(s.rooms)
    .where(inArray(s.rooms.propertyId, propertyIds))
    .orderBy(asc(s.rooms.label));
  const by = new Map<string, RoomAvailability[]>();
  for (const r of rows) {
    const sp = roomSpaces(r.kind, r.capacity, r.tenancies + r.takenManual);
    const list = by.get(r.propertyId) ?? [];
    list.push({ id: r.id, label: r.label, kind: r.kind, capacity: r.capacity, rentCents: r.rentCents, tenancies: r.tenancies, takenManual: r.takenManual, ...sp });
    by.set(r.propertyId, list);
  }
  return by;
}

async function ownedProperty(db: Db, actor: Actor, propertyId: string) {
  if (actor.role !== "owner" && actor.role !== "admin") fail("Only property owners can do this.");
  const [p] = await db.select().from(s.properties).where(and(eq(s.properties.id, propertyId), eq(s.properties.ownerId, actor.id))).limit(1);
  return p ?? fail("Property not found.");
}

async function listingOf(db: Db, propertyId: string) {
  const [l] = await db.select().from(s.listings).where(eq(s.listings.propertyId, propertyId)).limit(1);
  return l ?? null;
}

async function logEvent(db: Db, listingId: string, actorId: string, action: string, note?: string | null) {
  await db.insert(s.listingEvents).values({ listingId, actorId, action, note: note ?? null });
}

/** The property's listing, created as a draft the first time the owner touches it. */
export async function ensureListing(db: Db, actor: Actor, propertyId: string) {
  const p = await ownedProperty(db, actor, propertyId);
  const existing = await listingOf(db, propertyId);
  if (existing) return existing;
  const [created] = await db
    .insert(s.listings)
    .values({ propertyId, ownerId: actor.id, title: p.name, description: "", type: "boarding-house" })
    .onConflictDoNothing()
    .returning();
  const l = created ?? (await listingOf(db, propertyId))!;
  if (created) await logEvent(db, l.id, actor.id, "created");
  return l;
}

/* ---------------------------------------------------------------- Owner: details, rooms, photos */

export type ListingDetails = {
  title: string;
  type: PropertyType;
  description: string;
  amenities: string[];
  furnished: boolean;
  bathroom: "private" | "shared";
  utilitiesNote: string;
  minimumStayMonths: number;
  showPhone: boolean;
};

export async function saveListingDetails(db: Db, actor: Actor, propertyId: string, d: ListingDetails) {
  const l = await ensureListing(db, actor, propertyId);
  if (l.status === "archived") fail("This listing is archived. Restore it first.");
  await db
    .update(s.listings)
    .set({ ...d, updatedAt: new Date() })
    .where(and(eq(s.listings.id, l.id), eq(s.listings.ownerId, actor.id)));
  await logEvent(db, l.id, actor.id, "details-saved");
}

/** Rent and owner-marked beds. Taken beds can never exceed what tenancies leave free. */
export async function updateRoom(db: Db, actor: Actor, roomId: string, change: { rentCents?: number; takenManual?: number }) {
  if (actor.role !== "owner" && actor.role !== "admin") fail("Only property owners can do this.");
  const [r] = await db
    .select({
      id: s.rooms.id,
      propertyId: s.rooms.propertyId,
      capacity: s.rooms.capacity,
      tenancies: sql<number>`(select count(*)::int from ${s.tenancies} t where t.room_id = ${s.rooms.id} and t.end_date is null)`,
    })
    .from(s.rooms)
    .where(and(eq(s.rooms.id, roomId), eq(s.rooms.ownerId, actor.id)))
    .limit(1);
  if (!r) fail("Room not found.");
  const set: Partial<typeof s.rooms.$inferInsert> = { updatedAt: new Date() };
  if (change.rentCents !== undefined) {
    if (!Number.isInteger(change.rentCents) || change.rentCents <= 0 || change.rentCents > 50_000_000) fail("Enter a monthly rent above zero.");
    set.baseRentCents = change.rentCents;
  }
  if (change.takenManual !== undefined) {
    const max = r!.capacity - r!.tenancies;
    if (!Number.isInteger(change.takenManual) || change.takenManual < 0 || change.takenManual > max) fail(`Choose between 0 and ${max}.`);
    set.takenManual = change.takenManual;
  }
  await db.update(s.rooms).set(set).where(and(eq(s.rooms.id, roomId), eq(s.rooms.ownerId, actor.id)));
}

export async function confirmAvailability(db: Db, actor: Actor, propertyId: string, now = new Date()) {
  const l = await ensureListing(db, actor, propertyId);
  await db.update(s.listings).set({ availabilityConfirmedAt: now, updatedAt: now }).where(eq(s.listings.id, l.id));
  await logEvent(db, l.id, actor.id, "availability-confirmed");
}

export async function addPhoto(
  db: Db,
  actor: Actor,
  propertyId: string,
  photo: { key: string; width: number; height: number; bytes: number; alt: string; roomId?: string | null },
) {
  const l = await ensureListing(db, actor, propertyId);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.listingPhotos).where(eq(s.listingPhotos.listingId, l.id));
  if (n >= MAX_PHOTOS) fail(`A listing can have up to ${MAX_PHOTOS} photos.`);
  if (photo.roomId) {
    const [room] = await db.select({ id: s.rooms.id }).from(s.rooms).where(and(eq(s.rooms.id, photo.roomId), eq(s.rooms.propertyId, propertyId), eq(s.rooms.ownerId, actor.id))).limit(1);
    if (!room) fail("That room isn't part of this property.");
  }
  const [row] = await db
    .insert(s.listingPhotos)
    .values({ listingId: l.id, ownerId: actor.id, roomId: photo.roomId ?? null, storageKey: photo.key, width: photo.width, height: photo.height, byteSize: photo.bytes, alt: photo.alt, position: n })
    .returning({ id: s.listingPhotos.id });
  await logEvent(db, l.id, actor.id, "photo-added");
  return row.id;
}

/** Removes the row and returns the storage key so the caller deletes the file (no orphaned uploads). */
export async function removePhoto(db: Db, actor: Actor, photoId: string) {
  const [p] = await db
    .select({ id: s.listingPhotos.id, key: s.listingPhotos.storageKey, listingId: s.listingPhotos.listingId })
    .from(s.listingPhotos)
    .innerJoin(s.listings, eq(s.listings.id, s.listingPhotos.listingId))
    .where(and(eq(s.listingPhotos.id, photoId), eq(s.listings.ownerId, actor.id)))
    .limit(1);
  if (!p) fail("Photo not found.");
  await db.delete(s.listingPhotos).where(eq(s.listingPhotos.id, photoId));
  await logEvent(db, p!.listingId, actor.id, "photo-removed");
  return p!.key;
}

/* ---------------------------------------------------------------- Owner: the listing as the portal shows it */

export async function getOwnerListing(db: Db, actor: Actor, propertyId: string) {
  const p = await ownedProperty(db, actor, propertyId);
  const l = await listingOf(db, propertyId);
  const rooms = (await roomsWithAvailability(db, [propertyId])).get(propertyId) ?? [];
  const photos = l
    ? await db
        .select({ id: s.listingPhotos.id, key: s.listingPhotos.storageKey, alt: s.listingPhotos.alt, width: s.listingPhotos.width, height: s.listingPhotos.height, roomId: s.listingPhotos.roomId })
        .from(s.listingPhotos)
        .where(eq(s.listingPhotos.listingId, l.id))
        .orderBy(asc(s.listingPhotos.position), asc(s.listingPhotos.createdAt))
    : [];
  const checklist = publicationChecklist({
    title: l?.title ?? "",
    description: l?.description ?? "",
    type: l?.type ?? null,
    street: p.street,
    district: p.district,
    rooms,
    photos: photos.length,
  });
  return { property: p, listing: l, rooms, photos, checklist };
}

/* ---------------------------------------------------------------- Lifecycle */

/** Owner moves: submit, withdraw to draft, publish, pause, archive, restore. */
export async function ownerMove(db: Db, actor: Actor, propertyId: string, to: ListingStatus, now = new Date()) {
  const { listing: l, property, rooms, photos } = await getOwnerListing(db, actor, propertyId);
  if (!l) fail("Save the listing details first.");
  if (!canMove(l!.status, to, "owner")) fail(`A listing that is ${l!.status} can't be moved to ${to} by its owner.`);
  if (to === "submitted") {
    const complete = isComplete({ title: l!.title, description: l!.description, type: l!.type, street: property.street, district: property.district, rooms, photos: photos.length });
    if (!complete) fail("Finish the checklist before sending the listing for review.");
  }
  const set: Partial<typeof s.listings.$inferInsert> = { status: to, updatedAt: now };
  if (to === "submitted") set.submittedAt = now;
  if (to === "published") {
    // Publishing is the owner saying "this is available now": it counts as a confirmation
    set.publishedAt = now;
    set.availabilityConfirmedAt = now;
  }
  await db.update(s.listings).set(set).where(and(eq(s.listings.id, l!.id), eq(s.listings.ownerId, actor.id), eq(s.listings.status, l!.status)));
  await logEvent(db, l!.id, actor.id, `status:${to}`);
}

/** Admin review. Admins can't review their own listings. */
export async function reviewListing(db: Db, actor: Actor, listingId: string, decision: "approved" | "rejected", note: string, now = new Date()) {
  if (actor.role !== "admin") fail("Only an admin can review listings.");
  const [l] = await db.select().from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (!l) fail("Listing not found.");
  if (l!.ownerId === actor.id) fail("You can't review your own listing.");
  if (!canMove(l!.status, decision, "admin")) fail("Only listings waiting for review can be approved or rejected.");
  if (decision === "rejected" && note.trim().length < 5) fail("Tell the owner what to change.");
  await db
    .update(s.listings)
    .set({ status: decision, moderation: decision, reviewedAt: now, reviewedBy: actor.id, reviewNote: note.trim() || null, updatedAt: now })
    .where(and(eq(s.listings.id, listingId), eq(s.listings.status, "submitted")));
  await logEvent(db, listingId, actor.id, `review:${decision}`, note);
}

/** Admin takes a live listing down (e.g. after a report). The owner sees why. */
export async function adminPause(db: Db, actor: Actor, listingId: string, note: string, now = new Date()) {
  if (actor.role !== "admin") fail("Only an admin can do this.");
  if (note.trim().length < 5) fail("Give the owner a reason.");
  const [l] = await db.select().from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (!l || !canMove(l.status, "paused", "admin")) fail("Only live listings can be paused.");
  await db.update(s.listings).set({ status: "paused", reviewNote: note.trim(), updatedAt: now }).where(eq(s.listings.id, listingId));
  await logEvent(db, listingId, actor.id, "admin-paused", note);
}

/* ---------------------------------------------------------------- Public reads */

export type PublicRoom = { id: string; label: string; basis: "bed" | "room" | "unit"; rentCents: number; total: number; free: number };
export type PublicListingRow = {
  id: string;
  title: string;
  type: PropertyType;
  description: string;
  street: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  amenities: string[];
  furnished: boolean;
  bathroom: "private" | "shared";
  utilitiesNote: string;
  minimumStayMonths: number;
  priceFromCents: number;
  freeSpaces: number;
  rooms: PublicRoom[];
  photos: { key: string; alt: string; width: number; height: number }[];
  confirmedAt: Date;
  ownerName: string;
  ownerPhone: string | null;
};

const publicColumns = {
  id: s.listings.id,
  propertyId: s.listings.propertyId,
  ownerId: s.listings.ownerId,
  title: s.listings.title,
  type: s.listings.type,
  description: s.listings.description,
  amenities: s.listings.amenities,
  furnished: s.listings.furnished,
  bathroom: s.listings.bathroom,
  utilitiesNote: s.listings.utilitiesNote,
  minimumStayMonths: s.listings.minimumStayMonths,
  status: s.listings.status,
  showPhone: s.listings.showPhone,
  confirmedAt: s.listings.availabilityConfirmedAt,
  // Public location only: street, district, city and the offset point. Never exact_* columns.
  street: s.properties.street,
  district: s.properties.district,
  city: s.properties.city,
  lat: s.properties.publicLat,
  lng: s.properties.publicLng,
  ownerName: s.profiles.displayName,
  ownerPhone: s.profiles.phone,
};

async function hydrate(db: Db, rows: Awaited<ReturnType<typeof selectListings>>) {
  const propIds = rows.map((r) => r.propertyId!).filter(Boolean);
  const rooms = await roomsWithAvailability(db, propIds);
  const photos = rows.length
    ? await db
        .select({ listingId: s.listingPhotos.listingId, key: s.listingPhotos.storageKey, alt: s.listingPhotos.alt, width: s.listingPhotos.width, height: s.listingPhotos.height })
        .from(s.listingPhotos)
        .where(inArray(s.listingPhotos.listingId, rows.map((r) => r.id)))
        .orderBy(asc(s.listingPhotos.position), asc(s.listingPhotos.createdAt))
    : [];
  return rows.map((r) => {
    const rs = rooms.get(r.propertyId!) ?? [];
    const open = rs.filter((x) => x.free > 0);
    return {
      row: r,
      rooms: rs.map(({ id, label, basis, rentCents, total, free }) => ({ id, label, basis, rentCents, total, free })),
      freeSpaces: open.reduce((n, x) => n + x.free, 0),
      priceFromCents: open.length ? Math.min(...open.map((x) => x.rentCents)) : 0,
      photos: photos.filter((p) => p.listingId === r.id).map(({ key, alt, width, height }) => ({ key, alt, width, height })),
    };
  });
}

function selectListings(db: Db) {
  return db
    .select(publicColumns)
    .from(s.listings)
    .innerJoin(s.properties, eq(s.properties.id, s.listings.propertyId))
    .innerJoin(s.profiles, eq(s.profiles.userId, s.listings.ownerId));
}

function toPublic(h: Awaited<ReturnType<typeof hydrate>>[number]): PublicListingRow {
  const r = h.row;
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    description: r.description,
    street: r.street,
    district: r.district,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    amenities: r.amenities,
    furnished: r.furnished,
    bathroom: r.bathroom,
    utilitiesNote: r.utilitiesNote,
    minimumStayMonths: r.minimumStayMonths,
    priceFromCents: h.priceFromCents,
    freeSpaces: h.freeSpaces,
    rooms: h.rooms,
    photos: h.photos,
    confirmedAt: r.confirmedAt!,
    ownerName: r.ownerName,
    ownerPhone: r.showPhone ? r.ownerPhone : null,
  };
}

/**
 * Everything the public finder may show: published, owner not suspended, availability confirmed in
 * the last 30 days, and at least one free space. A full or stale listing is simply not on the map.
 */
export async function listPublicListings(db: Db, now = new Date()): Promise<PublicListingRow[]> {
  const rows = await selectListings(db).where(and(eq(s.listings.status, "published"), isNull(s.profiles.suspendedAt)));
  return (await hydrate(db, rows))
    .filter((h) => isFresh(h.row.confirmedAt, now) && h.freeSpaces > 0)
    .map(toPublic);
}

/**
 * One listing for its detail page. Anyone sees a live listing (even if currently full, so shared links
 * keep working); the owner and admins also see it in any other state, flagged as a preview.
 */
export async function getListingForViewer(db: Db, listingId: string, viewer: Actor | null, now = new Date()) {
  const rows = await selectListings(db).where(eq(s.listings.id, listingId)).limit(1);
  if (!rows.length) return null;
  const [h] = await hydrate(db, rows);
  const r = h.row;
  const live = r.status === "published" && isFresh(r.confirmedAt, now);
  const privileged = !!viewer && (viewer.id === r.ownerId || viewer.role === "admin");
  if (!live && !privileged) return null;
  return { listing: { ...toPublic(h), confirmedAt: r.confirmedAt ?? new Date(0) }, live, status: r.status, isOwner: viewer?.id === r.ownerId };
}

/* ---------------------------------------------------------------- Inquiries */

export type NewInquiry = { kind: "question" | "viewing"; message: string; preferredDate?: string | null; roomId?: string | null; phone?: string | null };

export async function createInquiry(db: Db, actor: Actor, listingId: string, input: NewInquiry, now = new Date()) {
  const msg = input.message.trim();
  if (msg.length < INQUIRY_MIN || msg.length > INQUIRY_MAX) fail(`Write between ${INQUIRY_MIN} and ${INQUIRY_MAX} characters.`);
  if (looksLikeSpam(msg)) fail("Links aren't allowed in a first message. Describe what you're looking for instead.");
  const [l] = await db
    .select({ id: s.listings.id, ownerId: s.listings.ownerId, status: s.listings.status, confirmedAt: s.listings.availabilityConfirmedAt, propertyId: s.listings.propertyId })
    .from(s.listings)
    .where(eq(s.listings.id, listingId))
    .limit(1);
  if (!l || l.status !== "published" || !isFresh(l.confirmedAt, now)) fail("This listing isn't taking inquiries right now.");
  if (l!.ownerId === actor.id) fail("This is your own listing.");
  if (input.kind === "viewing") {
    if (!input.preferredDate) fail("Pick a day for the viewing.");
    const day = new Date(`${input.preferredDate}T00:00:00+08:00`);
    const today = new Date(now.getTime() + 8 * HOUR);
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(day.getTime()) || day.getTime() < today.getTime() - 8 * HOUR || day.getTime() > now.getTime() + 90 * 24 * HOUR)
      fail("Choose a viewing day from today up to 90 days ahead.");
  }
  if (input.roomId) {
    const [room] = await db.select({ id: s.rooms.id }).from(s.rooms).where(and(eq(s.rooms.id, input.roomId), eq(s.rooms.propertyId, l!.propertyId!))).limit(1);
    if (!room) fail("That room isn't part of this listing.");
  }
  // One open conversation per renter and listing, and a cap on new inquiries per hour
  const [open] = await db
    .select({ id: s.inquiries.id })
    .from(s.inquiries)
    .where(and(eq(s.inquiries.listingId, listingId), eq(s.inquiries.renterId, actor.id), ne(s.inquiries.status, "closed")))
    .limit(1);
  if (open) fail("You already have an open inquiry for this place. Continue it in your inquiries.");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.inquiries)
    .where(and(eq(s.inquiries.renterId, actor.id), gte(s.inquiries.createdAt, new Date(now.getTime() - HOUR))));
  if (n >= INQUIRIES_PER_HOUR) fail("You've sent several inquiries in the last hour. Try again a little later.");

  const [row] = await db
    .insert(s.inquiries)
    .values({
      listingId,
      ownerId: l!.ownerId,
      renterId: actor.id,
      kind: input.kind,
      roomId: input.roomId ?? null,
      message: msg,
      preferredViewingDate: input.kind === "viewing" ? input.preferredDate! : null,
      renterPhone: input.phone ?? null,
    })
    .returning({ id: s.inquiries.id });
  return row.id;
}

const inquiryColumns = {
  id: s.inquiries.id,
  kind: s.inquiries.kind,
  status: s.inquiries.status,
  message: s.inquiries.message,
  preferredViewingDate: s.inquiries.preferredViewingDate,
  createdAt: s.inquiries.createdAt,
  updatedAt: s.inquiries.updatedAt,
  ownerReadAt: s.inquiries.ownerReadAt,
  listingId: s.inquiries.listingId,
  listingTitle: s.listings.title,
};

/** Owner inbox: only inquiries addressed to this owner. Renters appear by display name only. */
export async function listOwnerInquiries(db: Db, actor: Actor) {
  if (actor.role !== "owner" && actor.role !== "admin") fail("Only property owners have an inquiry inbox.");
  return db
    .select({ ...inquiryColumns, renterName: s.profiles.displayName })
    .from(s.inquiries)
    .innerJoin(s.listings, eq(s.listings.id, s.inquiries.listingId))
    .innerJoin(s.profiles, eq(s.profiles.userId, s.inquiries.renterId))
    .where(eq(s.inquiries.ownerId, actor.id))
    .orderBy(desc(s.inquiries.updatedAt));
}

export async function listRenterInquiries(db: Db, actor: Actor) {
  return db
    .select({ ...inquiryColumns, ownerName: s.profiles.displayName })
    .from(s.inquiries)
    .innerJoin(s.listings, eq(s.listings.id, s.inquiries.listingId))
    .innerJoin(s.profiles, eq(s.profiles.userId, s.inquiries.ownerId))
    .where(eq(s.inquiries.renterId, actor.id))
    .orderBy(desc(s.inquiries.updatedAt));
}

/** A thread, for its two participants only. The renter's phone is shown to the owner only if shared. */
export async function getThread(db: Db, actor: Actor, inquiryId: string, now = new Date()) {
  const [i] = await db
    .select({
      ...inquiryColumns,
      ownerId: s.inquiries.ownerId,
      renterId: s.inquiries.renterId,
      renterPhone: s.inquiries.renterPhone,
      roomLabel: s.rooms.label,
    })
    .from(s.inquiries)
    .innerJoin(s.listings, eq(s.listings.id, s.inquiries.listingId))
    .leftJoin(s.rooms, eq(s.rooms.id, s.inquiries.roomId))
    .where(eq(s.inquiries.id, inquiryId))
    .limit(1);
  if (!i || (i.ownerId !== actor.id && i.renterId !== actor.id)) fail("Inquiry not found.");
  const asOwner = i!.ownerId === actor.id;
  const people = await db
    .select({ id: s.profiles.userId, name: s.profiles.displayName })
    .from(s.profiles)
    .where(inArray(s.profiles.userId, [i!.ownerId, i!.renterId]));
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const messages = await db
    .select({ id: s.inquiryMessages.id, senderId: s.inquiryMessages.senderId, body: s.inquiryMessages.body, createdAt: s.inquiryMessages.createdAt })
    .from(s.inquiryMessages)
    .where(eq(s.inquiryMessages.inquiryId, inquiryId))
    .orderBy(asc(s.inquiryMessages.createdAt));
  if (asOwner && !i!.ownerReadAt) await db.update(s.inquiries).set({ ownerReadAt: now }).where(eq(s.inquiries.id, inquiryId));
  const { ownerId, renterId, renterPhone, ...rest } = i!;
  return {
    inquiry: { ...rest, renterPhone: asOwner ? renterPhone : null },
    asOwner,
    ownerName: nameOf.get(ownerId) ?? "Owner",
    renterName: nameOf.get(renterId) ?? "Renter",
    messages: messages.map((m) => ({ ...m, mine: m.senderId === actor.id, fromOwner: m.senderId === ownerId })),
  };
}

export async function replyToInquiry(db: Db, actor: Actor, inquiryId: string, body: string, now = new Date()) {
  const text = body.trim();
  if (text.length < 1 || text.length > INQUIRY_MAX) fail(`Write up to ${INQUIRY_MAX} characters.`);
  const [i] = await db.select({ ownerId: s.inquiries.ownerId, renterId: s.inquiries.renterId, status: s.inquiries.status }).from(s.inquiries).where(eq(s.inquiries.id, inquiryId)).limit(1);
  if (!i || (i.ownerId !== actor.id && i.renterId !== actor.id)) fail("Inquiry not found.");
  if (i!.status === "closed") fail("This inquiry is closed.");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.inquiryMessages)
    .where(and(eq(s.inquiryMessages.senderId, actor.id), gte(s.inquiryMessages.createdAt, new Date(now.getTime() - HOUR))));
  if (n >= MESSAGES_PER_HOUR) fail("You've sent a lot of messages in the last hour. Try again a little later.");
  if (i!.renterId === actor.id && looksLikeSpam(text)) fail("Links aren't allowed in messages.");
  await db.insert(s.inquiryMessages).values({ inquiryId, senderId: actor.id, body: text });
  const status = i!.ownerId === actor.id && i!.status === "new" ? "replied" : i!.status;
  await db.update(s.inquiries).set({ status, updatedAt: now }).where(eq(s.inquiries.id, inquiryId));
}

/** Owner: replied / viewing-set / closed. Renter: may close their own inquiry. */
export async function setInquiryStatus(db: Db, actor: Actor, inquiryId: string, status: "replied" | "viewing-set" | "closed", now = new Date()) {
  const [i] = await db.select({ ownerId: s.inquiries.ownerId, renterId: s.inquiries.renterId }).from(s.inquiries).where(eq(s.inquiries.id, inquiryId)).limit(1);
  if (!i) fail("Inquiry not found.");
  const isOwner = i!.ownerId === actor.id;
  const isRenter = i!.renterId === actor.id;
  if (!isOwner && !(isRenter && status === "closed")) fail("Inquiry not found.");
  await db.update(s.inquiries).set({ status, updatedAt: now }).where(eq(s.inquiries.id, inquiryId));
}

/* ---------------------------------------------------------------- Reports and admin */

export const REPORT_REASONS = {
  inaccurate: "Price, rooms or availability are wrong",
  unauthorized: "Not posted by the owner, or photos used without permission",
  unavailable: "The place is no longer available",
  scam: "Looks like a scam or asks for money up front",
  other: "Something else",
} as const;

export async function createReport(db: Db, actor: Actor, listingId: string, reason: keyof typeof REPORT_REASONS, details: string, now = new Date()) {
  if (!(reason in REPORT_REASONS)) fail("Choose a reason.");
  const d = details.trim();
  if (d.length > 1000) fail("Keep the details under 1000 characters.");
  const [l] = await db.select({ id: s.listings.id }).from(s.listings).where(eq(s.listings.id, listingId)).limit(1);
  if (!l) fail("Listing not found.");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.reports)
    .where(and(eq(s.reports.reporterId, actor.id), gte(s.reports.createdAt, new Date(now.getTime() - 24 * HOUR))));
  if (n >= 5) fail("You've sent several reports today. We'll look at them first.");
  await db.insert(s.reports).values({ listingId, reporterId: actor.id, reason, details: d || null });
}

export async function adminQueues(db: Db, actor: Actor) {
  if (actor.role !== "admin") fail("Admins only.");
  const submitted = await db
    .select({ id: s.listings.id, title: s.listings.title, submittedAt: s.listings.submittedAt, ownerName: s.profiles.displayName, district: s.properties.district })
    .from(s.listings)
    .innerJoin(s.profiles, eq(s.profiles.userId, s.listings.ownerId))
    .innerJoin(s.properties, eq(s.properties.id, s.listings.propertyId))
    .where(eq(s.listings.status, "submitted"))
    .orderBy(asc(s.listings.submittedAt));
  const reports = await db
    .select({ id: s.reports.id, listingId: s.reports.listingId, reason: s.reports.reason, details: s.reports.details, createdAt: s.reports.createdAt, status: s.reports.status, listingTitle: s.listings.title, listingStatus: s.listings.status })
    .from(s.reports)
    .leftJoin(s.listings, eq(s.listings.id, s.reports.listingId))
    .where(inArray(s.reports.status, ["open", "reviewing"]))
    .orderBy(asc(s.reports.createdAt));
  return { submitted, reports };
}

export async function resolveReport(db: Db, actor: Actor, reportId: string, status: "resolved" | "dismissed", now = new Date()) {
  if (actor.role !== "admin") fail("Admins only.");
  await db.update(s.reports).set({ status, handledBy: actor.id, resolvedAt: now }).where(eq(s.reports.id, reportId));
}
