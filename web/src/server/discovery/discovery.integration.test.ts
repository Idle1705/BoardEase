/*
 * Discovery integration tests against the Neon DEV branch (never main).
 *   npm run test:integration
 * Each run creates its own "[TEST]" rows with a random tag and deletes them at the end.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray } from "drizzle-orm";
import * as s from "../db/schema";
import { discover } from "@/lib/discovery";
import {
  createRenterRequest,
  decideClaim,
  DiscoveryError,
  listDiscoveryItems,
  listOpenRequests,
  markStaleExternal,
  readThread,
  respondToRequest,
  sendMessage,
  submitClaim,
  submitExternalReference,
  type Actor,
} from "./core";

const url = process.env.DISCOVERY_DATABASE_URL;
const mainUrl = process.env.DATABASE_URL;
const run = !!url && url !== mainUrl;
const db = run ? drizzle(neon(url!), { schema: s }) : (null as never);

const tag = Math.random().toString(36).slice(2, 8);
const owner: Actor = { id: `test-owner-${tag}`, role: "owner" };
const otherOwner: Actor = { id: `test-owner2-${tag}`, role: "owner" };
const renter: Actor = { id: `test-renter-${tag}`, role: "renter" };
const admin: Actor = { id: `test-admin-${tag}`, role: "admin" };
const UM = { lat: 7.06715, lng: 125.59493 };
const ids = { property: "", otherProperty: "", room: "", listing: "", building: "", source: "", external: "" };
const SECRET_ADDRESS = `Unit 7, 123 Secret Street ${tag}`;

beforeAll(async () => {
  if (!run) return;
  await db.insert(s.profiles).values(
    [owner, otherOwner, renter, admin].map((a) => ({ userId: a.id, role: a.role, displayName: `[TEST] ${a.role} ${tag}` })),
  );
  const [src] = await db
    .insert(s.sources)
    .values({ key: "advertiser-submitted", name: "Submitted by the advertiser", kind: "advertiser_submitted", basis: "advertiser_consent", licence: "BoardEase submission terms (draft)", attribution: "Submitted by the advertiser" })
    .onConflictDoUpdate({ target: s.sources.key, set: { name: "Submitted by the advertiser" } })
    .returning({ id: s.sources.id });
  ids.source = src.id;
  const [b] = await db
    .insert(s.buildings)
    .values({ sourceId: src.id, externalRef: `test:${tag}`, name: `[TEST] Building ${tag}`, kind: "dormitory", district: "Matina", lat: UM.lat + 0.002, lng: UM.lng, status: "active" })
    .returning({ id: s.buildings.id });
  ids.building = b.id;
  const [p] = await db
    .insert(s.properties)
    .values({ ownerId: owner.id, name: `[TEST] Property ${tag}`, street: "MacArthur Highway", district: "Matina", exactAddress: SECRET_ADDRESS, exactLat: 7.0601, exactLng: 125.5901, publicLat: UM.lat + 0.002, publicLng: UM.lng })
    .returning({ id: s.properties.id });
  ids.property = p.id;
  const [p2] = await db
    .insert(s.properties)
    .values({ ownerId: otherOwner.id, name: `[TEST] Other ${tag}`, street: "Quimpo Boulevard", district: "Ecoland", publicLat: 7.05, publicLng: 125.59 })
    .returning({ id: s.properties.id });
  ids.otherProperty = p2.id;
  const [r] = await db.insert(s.rooms).values({ propertyId: p.id, ownerId: owner.id, label: "R1", kind: "shared", capacity: 2, baseRentCents: 300000 }).returning({ id: s.rooms.id });
  ids.room = r.id;
  const [l] = await db
    .insert(s.listings)
    .values({ roomId: r.id, ownerId: owner.id, title: `[TEST] Shared room ${tag}`, description: "Test", type: "bedspace", monthlyPriceCents: 300000, bathroom: "shared", status: "published", moderation: "approved", publishedAt: new Date(), availabilityConfirmedAt: new Date() })
    .returning({ id: s.listings.id });
  ids.listing = l.id;
});

afterAll(async () => {
  if (!run) return;
  const people = [owner, otherOwner, renter, admin].map((a) => a.id);
  // Children first; everything below was created by this run only
  const reqs = await db.select({ id: s.renterRequests.id }).from(s.renterRequests).where(inArray(s.renterRequests.renterId, people));
  if (reqs.length) await db.delete(s.renterRequests).where(inArray(s.renterRequests.id, reqs.map((x) => x.id)));
  await db.delete(s.propertyBuildingLinks).where(inArray(s.propertyBuildingLinks.propertyId, [ids.property, ids.otherProperty].filter(Boolean)));
  await db.delete(s.propertyClaims).where(inArray(s.propertyClaims.claimantId, people));
  await db.delete(s.availabilityChecks).where(eq(s.availabilityChecks.listingId, ids.listing));
  await db.delete(s.externalListings).where(inArray(s.externalListings.submittedBy, people));
  await db.delete(s.listings).where(eq(s.listings.id, ids.listing));
  await db.delete(s.rooms).where(eq(s.rooms.id, ids.room));
  await db.delete(s.properties).where(inArray(s.properties.id, [ids.property, ids.otherProperty]));
  await db.delete(s.buildings).where(eq(s.buildings.id, ids.building));
  await db.delete(s.profiles).where(inArray(s.profiles.userId, people));
});

const expectRefused = async (p: Promise<unknown>, msg: RegExp) => {
  await expect(p).rejects.toBeInstanceOf(DiscoveryError);
  await expect(p).rejects.toThrow(msg);
};

describe.skipIf(!run)("discovery on the dev branch", () => {
  it("never runs against the main database", () => {
    expect(url).not.toBe(mainUrl);
  });

  it("public results never carry the exact address or private coordinates", async () => {
    const items = await listDiscoveryItems(db);
    const json = JSON.stringify(items);
    expect(json).not.toContain(SECRET_ADDRESS);
    expect(json).not.toContain("7.0601");
    const mine = items.find((i) => i.id === ids.listing);
    expect(mine?.lat).toBeCloseTo(UM.lat + 0.002);
  });

  it("a published listing with no confirmation shows as unconfirmed, then confirmed, then disappears when full", async () => {
    let mine = (await listDiscoveryItems(db)).find((i) => i.id === ids.listing);
    expect(mine?.verification.state).toBe("unconfirmed");
    await db.insert(s.availabilityChecks).values({ listingId: ids.listing, result: "available", freeBeds: 1, method: "tenancy_records" });
    mine = (await listDiscoveryItems(db)).find((i) => i.id === ids.listing);
    expect(mine?.verification).toMatchObject({ state: "confirmed", freeBeds: 1 });
    await db.insert(s.availabilityChecks).values({ listingId: ids.listing, result: "unavailable", freeBeds: 0, method: "tenancy_records", checkedAt: new Date(Date.now() + 1000) });
    expect((await listDiscoveryItems(db)).find((i) => i.id === ids.listing)).toBeUndefined();
    await db.insert(s.availabilityChecks).values({ listingId: ids.listing, result: "available", freeBeds: 1, method: "owner_confirmed", checkedAt: new Date(Date.now() + 2000) });
  });

  it("directory buildings come back as buildings and are never counted as results", async () => {
    const items = await listDiscoveryItems(db);
    const b = items.find((i) => i.id === ids.building);
    expect(b?.kind).toBe("building");
    const out = discover(items, { centre: UM, radiusKm: 2, show: { listings: true, external: true, directory: true } });
    expect(out.results.some((r) => r.kind === "building")).toBe(false);
  });

  it("advertiser references need consent and https, are stored once per advert, and wait for review", async () => {
    const base = { title: `[TEST] Bedspace ad ${tag}`, propertyType: "bedspace", district: "Matina", priceCents: 280000, buildingId: ids.building };
    await expectRefused(submitExternalReference(db, renter, { ...base, url: `https://example.test/ad-${tag}`, consent: false }), /posted this advert yourself/);
    await expectRefused(submitExternalReference(db, renter, { ...base, url: `http://example.test/ad-${tag}`, consent: true }), /https/);
    ids.external = await submitExternalReference(db, renter, { ...base, url: `https://www.example.test/ad-${tag}?utm_source=fb`, consent: true });
    await expectRefused(submitExternalReference(db, renter, { ...base, url: `https://example.test/ad-${tag}/`, consent: true }), /already on BoardEase/);
    expect((await listDiscoveryItems(db)).find((i) => i.id === ids.external)).toBeUndefined(); // pending review
  });

  it("a published reference reads as advertised, and turns stale after its check window", async () => {
    await db.update(s.externalListings).set({ status: "published", lastCheckedAt: new Date() }).where(eq(s.externalListings.id, ids.external));
    let ext = (await listDiscoveryItems(db)).find((i) => i.id === ids.external);
    expect(ext?.verification.state).toBe("advertised");
    expect(ext?.url).toContain("example.test");
    await db.update(s.externalListings).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(s.externalListings.id, ids.external));
    expect(await markStaleExternal(db)).toBeGreaterThanOrEqual(1);
    ext = (await listDiscoveryItems(db)).find((i) => i.id === ids.external);
    expect(ext?.verification.state).toBe("stale");
    const out = discover(await listDiscoveryItems(db), { centre: UM, radiusKm: 2, show: { listings: true, external: true, directory: false } });
    expect(out.results.some((r) => r.id === ids.external)).toBe(false);
    expect(out.staleHidden).toBeGreaterThanOrEqual(1);
  });

  it("claims need an owner account and evidence; only a moderator decides; ownership never moves to someone else's property", async () => {
    await expectRefused(submitClaim(db, renter, { buildingId: ids.building, role: "owner", scope: "Whole building", evidenceKeys: ["k"] }), /Only owner accounts/);
    await expectRefused(submitClaim(db, owner, { buildingId: ids.building, role: "owner", scope: "Whole building", evidenceKeys: [] }), /document/);
    const claim = await submitClaim(db, owner, { buildingId: ids.building, role: "owner", scope: "Whole building", evidenceKeys: ["declared:land-title"] });
    expect(claim.status).toBe("pending");
    await expectRefused(submitClaim(db, owner, { buildingId: ids.building, role: "owner", scope: "Whole building", evidenceKeys: ["k2"] }), /already have a claim/);
    await expectRefused(decideClaim(db, owner, { claimId: claim.id, approve: true, propertyId: ids.property, note: "self" }), /moderator/);
    await expectRefused(decideClaim(db, admin, { claimId: claim.id, approve: true, propertyId: ids.otherProperty, note: "wrong" }), /doesn't belong/);
    const decided = await decideClaim(db, admin, { claimId: claim.id, approve: true, propertyId: ids.property, note: "Title checked" });
    expect(decided.status).toBe("approved");
    const [link] = await db.select().from(s.propertyBuildingLinks).where(eq(s.propertyBuildingLinks.propertyId, ids.property));
    expect(link.buildingId).toBe(ids.building);
    const [other] = await db.select().from(s.propertyBuildingLinks).where(eq(s.propertyBuildingLinks.propertyId, ids.otherProperty));
    expect(other).toBeUndefined();
  });

  it("after the claim, the BoardEase listing and a matching advert in the same building count once", async () => {
    await db.update(s.externalListings).set({ status: "published", lastCheckedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000), advertisedPriceCents: 300000 }).where(eq(s.externalListings.id, ids.external));
    const out = discover(await listDiscoveryItems(db), { centre: UM, radiusKm: 2, show: { listings: true, external: true, directory: true } });
    expect(out.results.some((r) => r.id === ids.listing)).toBe(true);
    expect(out.results.some((r) => r.id === ids.external)).toBe(false);
    expect(out.directory.some((r) => r.id === ids.building)).toBe(false);
  });

  it("renter requests are private: owners see district and budget, never who asked; threads are for the two people only", async () => {
    const reqId = await createRenterRequest(db, renter, { district: "Matina", maxBudget: 4000, propertyType: "bedspace", moveIn: "2026-12-01", amenities: ["wifi"], note: "Call me 09171234567" });
    await expectRefused(listOpenRequests(db, renter), /Only owners/);
    const open = await listOpenRequests(db, owner);
    const mine = open.find((r) => r.id === reqId);
    expect(mine).toBeTruthy();
    expect(Object.keys(mine!).sort()).toEqual(["amenities", "district", "id", "maxBudgetCents", "moveIn", "propertyType"]);
    expect(JSON.stringify(open)).not.toContain("09171234567");
    expect(JSON.stringify(open)).not.toContain(renter.id);
    await expectRefused(respondToRequest(db, owner, { requestId: reqId, message: "Hi", listingId: "00000000-0000-0000-0000-000000000000" }), /own listings/);
    const resp = await respondToRequest(db, owner, { requestId: reqId, message: "I have a bedspace near UM", listingId: ids.listing });
    await sendMessage(db, renter, resp, "Is it still free?");
    expect((await readThread(db, renter, resp)).map((m) => m.body)).toEqual(["Is it still free?"]);
    await expectRefused(readThread(db, otherOwner, resp), /can't read/);
    await expectRefused(sendMessage(db, otherOwner, resp, "hello"), /can't post/);
  });
});
