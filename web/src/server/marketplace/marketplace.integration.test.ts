/*
 * Marketplace acceptance test against the Neon `marketplace-dev` branch (never main).
 *   npm run test:integration
 * Creates "[TEST]" owners, a renter, an admin, a property, rooms and photo rows with a random tag,
 * walks the full pilot workflow, and deletes everything it made at the end. No files are uploaded:
 * photo rows use fake keys (the upload route is tested in the browser run).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, like } from "drizzle-orm";
import * as s from "../db/schema";
import {
  addPhoto,
  adminPause,
  createInquiry,
  createReport,
  ensureListing,
  getListingForViewer,
  getOwnerListing,
  getThread,
  listOwnerInquiries,
  listPublicListings,
  listRenterInquiries,
  MarketError,
  ownerMove,
  removePhoto,
  replyToInquiry,
  reviewListing,
  saveListingDetails,
  setInquiryStatus,
  updateRoom,
  type Actor,
  type Db,
} from "./core";

const url = process.env.MARKETPLACE_DATABASE_URL;
const run = !!url && url !== process.env.DATABASE_URL;
const db = (run ? drizzle(neon(url!), { schema: s }) : null) as unknown as Db;

const tag = Math.random().toString(36).slice(2, 8);
const owner: Actor = { id: `test-mk-owner-${tag}`, role: "owner" };
const other: Actor = { id: `test-mk-owner2-${tag}`, role: "owner" };
const renter: Actor = { id: `test-mk-renter-${tag}`, role: "renter" };
const renter2: Actor = { id: `test-mk-renter2-${tag}`, role: "renter" };
const admin: Actor = { id: `test-mk-admin-${tag}`, role: "admin" };
const SECRET = `Unit 9, 77 Private Lane ${tag}`;
const ids = { property: "", otherProperty: "", shared: "", single: "", listing: "", photo: "", inquiry: "" };

const details = {
  title: `[TEST] Rooms near UM ${tag}`,
  type: "boarding-house" as const,
  description: "Clean shared and single rooms on a quiet street, a five minute walk to the University of Mindanao gate.",
  amenities: ["Wi-Fi", "Water included"],
  furnished: true,
  bathroom: "shared" as const,
  utilitiesNote: "Electricity by sub-meter",
  minimumStayMonths: 6,
  showPhone: false,
};

const expectRefused = async (p: Promise<unknown>, text?: RegExp) => {
  await expect(p).rejects.toBeInstanceOf(MarketError);
  if (text) await expect(p).rejects.toThrow(text);
};

describe.skipIf(!run)("marketplace pilot workflow (marketplace-dev branch)", () => {
  beforeAll(async () => {
    await db.insert(s.profiles).values([
      { userId: owner.id, role: "owner", displayName: `[TEST] Owner ${tag}`, phone: "09170000001" },
      { userId: other.id, role: "owner", displayName: `[TEST] Other owner ${tag}` },
      { userId: renter.id, role: "renter", displayName: `[TEST] Renter ${tag}` },
      { userId: renter2.id, role: "renter", displayName: `[TEST] Renter two ${tag}` },
      { userId: admin.id, role: "admin", displayName: `[TEST] Admin ${tag}` },
    ]);
    const [p] = await db
      .insert(s.properties)
      .values({ ownerId: owner.id, name: `[TEST] House ${tag}`, street: "MacArthur Highway", district: "Matina", exactAddress: SECRET, exactLat: 7.0672, exactLng: 125.5949, publicLat: 7.0681, publicLng: 125.5957 })
      .returning();
    ids.property = p.id;
    const [p2] = await db
      .insert(s.properties)
      .values({ ownerId: other.id, name: `[TEST] Other ${tag}`, street: "Bajada", district: "Bajada", publicLat: 7.09, publicLng: 125.61 })
      .returning();
    ids.otherProperty = p2.id;
    const [shared] = await db.insert(s.rooms).values({ propertyId: p.id, ownerId: owner.id, label: "Room A", kind: "shared", capacity: 3, baseRentCents: 220000 }).returning();
    const [single] = await db.insert(s.rooms).values({ propertyId: p.id, ownerId: owner.id, label: "Room B", kind: "single", capacity: 1, baseRentCents: 450000 }).returning();
    ids.shared = shared.id;
    ids.single = single.id;
  });

  afterAll(async () => {
    const people = [owner.id, other.id, renter.id, renter2.id, admin.id];
    const ls = await db.select({ id: s.listings.id }).from(s.listings).where(inArray(s.listings.ownerId, people));
    const lids = ls.map((l) => l.id);
    if (lids.length) {
      await db.delete(s.reports).where(inArray(s.reports.listingId, lids));
      const inq = await db.select({ id: s.inquiries.id }).from(s.inquiries).where(inArray(s.inquiries.listingId, lids));
      if (inq.length) await db.delete(s.inquiryMessages).where(inArray(s.inquiryMessages.inquiryId, inq.map((i) => i.id)));
      await db.delete(s.inquiries).where(inArray(s.inquiries.listingId, lids));
      await db.delete(s.listingEvents).where(inArray(s.listingEvents.listingId, lids));
      await db.delete(s.listingPhotos).where(inArray(s.listingPhotos.listingId, lids));
      await db.delete(s.listings).where(inArray(s.listings.id, lids));
    }
    await db.delete(s.rooms).where(inArray(s.rooms.ownerId, people));
    await db.delete(s.properties).where(inArray(s.properties.ownerId, people));
    await db.delete(s.profiles).where(inArray(s.profiles.userId, people));
    const left = await db.select({ id: s.profiles.userId }).from(s.profiles).where(like(s.profiles.userId, `test-mk-%-${tag}`));
    expect(left).toHaveLength(0);
  });

  it("an owner saves an unfinished draft; another owner can't touch it", async () => {
    await saveListingDetails(db, owner, ids.property, { ...details, description: "Short for now" });
    const draft = await getOwnerListing(db, owner, ids.property);
    expect(draft.listing?.status).toBe("draft");
    expect(draft.checklist.find((c) => c.key === "description")?.ok).toBe(false);
    ids.listing = draft.listing!.id;

    await expectRefused(getOwnerListing(db, other, ids.property), /not found/i);
    await expectRefused(saveListingDetails(db, other, ids.property, details), /not found/i);
    await expectRefused(updateRoom(db, other, ids.shared, { rentCents: 1 }), /not found/i);
    await expectRefused(ensureListing(db, renter, ids.property), /owners/i);
  });

  it("can't be submitted until the checklist is complete", async () => {
    await expectRefused(ownerMove(db, owner, ids.property, "submitted"), /checklist/i);
    await saveListingDetails(db, owner, ids.property, details);
    await addPhoto(db, owner, ids.property, { key: `test/${tag}/a.webp`, width: 1600, height: 1200, bytes: 1000, alt: "Front of the house" });
    ids.photo = await addPhoto(db, owner, ids.property, { key: `test/${tag}/b.webp`, width: 1600, height: 1200, bytes: 1000, alt: "Room A beds", roomId: ids.shared });
    await expectRefused(addPhoto(db, owner, ids.property, { key: `test/${tag}/x.webp`, width: 1, height: 1, bytes: 1, alt: "x", roomId: ids.otherProperty }), /room/i);
    await expectRefused(removePhoto(db, other, ids.photo), /not found/i);
    await ownerMove(db, owner, ids.property, "submitted");
    expect((await getOwnerListing(db, owner, ids.property)).listing?.status).toBe("submitted");
  });

  it("only an admin approves, never the owner, and the owner publishes", async () => {
    await expectRefused(ownerMove(db, owner, ids.property, "published"));
    await expectRefused(reviewListing(db, owner, ids.listing, "approved", ""), /admin/i);
    await expectRefused(reviewListing(db, admin, ids.listing, "rejected", ""), /what to change/i);
    await reviewListing(db, admin, ids.listing, "approved", "Photos and prices look consistent.");
    // Not public yet: approved is not live
    expect((await listPublicListings(db)).some((l) => l.id === ids.listing)).toBe(false);
    await ownerMove(db, owner, ids.property, "published");
  });

  it("appears in the public finder with real availability and no private data", async () => {
    const live = (await listPublicListings(db)).find((l) => l.id === ids.listing);
    expect(live).toBeTruthy();
    expect(live!.freeSpaces).toBe(4); // 3 beds in Room A + Room B as one room
    expect(live!.priceFromCents).toBe(220000);
    expect(live!.ownerPhone).toBeNull(); // owner did not choose to show it
    expect(JSON.stringify(live)).not.toContain(SECRET);
    expect(JSON.stringify(live)).not.toContain(owner.id);
    expect(live!.lat).not.toBe(7.0672);
  });

  it("a renter inquires; only that owner sees it; limits hold", async () => {
    await expectRefused(createInquiry(db, owner, ids.listing, { kind: "question", message: "Asking my own listing here" }), /own listing/i);
    await expectRefused(createInquiry(db, renter, ids.listing, { kind: "question", message: "See http://spam.example" }), /links/i);
    await expectRefused(createInquiry(db, renter, ids.listing, { kind: "viewing", message: "Can I view the room please?" }), /day/i);
    ids.inquiry = await createInquiry(db, renter, ids.listing, { kind: "question", message: "Is a bed in Room A free from June?", roomId: ids.shared, phone: "09179998888" });
    await expectRefused(createInquiry(db, renter, ids.listing, { kind: "question", message: "Asking again about the room" }), /already/i);

    expect((await listOwnerInquiries(db, owner)).map((i) => i.id)).toContain(ids.inquiry);
    expect((await listOwnerInquiries(db, other)).map((i) => i.id)).not.toContain(ids.inquiry);
    await expectRefused(getThread(db, other, ids.inquiry), /not found/i);
    await expectRefused(getThread(db, renter2, ids.inquiry), /not found/i);
    await expectRefused(listOwnerInquiries(db, renter), /owners/i);

    const asOwner = await getThread(db, owner, ids.inquiry);
    expect(asOwner.inquiry.renterPhone).toBe("09179998888"); // shared by the renter with this owner
    const asRenter = await getThread(db, renter, ids.inquiry);
    expect(JSON.stringify(asRenter)).not.toContain(owner.id);
  });

  it("the owner replies and updates availability; the finder follows", async () => {
    await replyToInquiry(db, owner, ids.inquiry, "Yes, one bed is free from June. Viewing on Saturday?");
    await setInquiryStatus(db, owner, ids.inquiry, "viewing-set");
    await expectRefused(setInquiryStatus(db, renter2, ids.inquiry, "closed"), /not found/i);
    const mine = await listRenterInquiries(db, renter);
    expect(mine.find((i) => i.id === ids.inquiry)?.status).toBe("viewing-set");

    // Two of Room A's three beds and the single room get taken
    await updateRoom(db, owner, ids.shared, { takenManual: 2 });
    await updateRoom(db, owner, ids.single, { takenManual: 1 });
    await expectRefused(updateRoom(db, owner, ids.shared, { takenManual: 4 }), /between 0 and 3/);
    const live = (await listPublicListings(db)).find((l) => l.id === ids.listing)!;
    expect(live.freeSpaces).toBe(1);
    expect(live.priceFromCents).toBe(220000);

    // Last bed taken: the listing leaves the finder, but its page still loads for shared links
    await updateRoom(db, owner, ids.shared, { takenManual: 3 });
    expect((await listPublicListings(db)).some((l) => l.id === ids.listing)).toBe(false);
    const page = await getListingForViewer(db, ids.listing, null);
    expect(page?.listing.freeSpaces).toBe(0);
    await updateRoom(db, owner, ids.shared, { takenManual: 1 });
    expect((await listPublicListings(db)).find((l) => l.id === ids.listing)?.freeSpaces).toBe(2);
  });

  it("stale, paused or reported listings are not live", async () => {
    const in40days = new Date(Date.now() + 40 * 86_400_000);
    expect((await listPublicListings(db, in40days)).some((l) => l.id === ids.listing)).toBe(false);
    expect(await getListingForViewer(db, ids.listing, null, in40days)).toBeNull();
    expect((await getListingForViewer(db, ids.listing, owner, in40days))?.live).toBe(false); // owner still sees a preview

    await createReport(db, renter2, ids.listing, "inaccurate", "Price on the gate sign is higher");
    await expectRefused(adminPause(db, owner, ids.listing, "nope"), /admin/i);
    await adminPause(db, admin, ids.listing, "Checking the price after a report");
    expect((await listPublicListings(db)).some((l) => l.id === ids.listing)).toBe(false);
    await expectRefused(createInquiry(db, renter2, ids.listing, { kind: "question", message: "Is this still available?" }), /isn't taking/i);
    const [row] = await db.select({ status: s.listings.status }).from(s.listings).where(eq(s.listings.id, ids.listing));
    expect(row.status).toBe("paused");
  });
});
