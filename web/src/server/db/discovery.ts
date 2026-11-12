/*
 * Real-world rental discovery (docs/web/DISCOVERY-FEASIBILITY.md).
 *
 * Kept apart on purpose:
 *  - sources:            who a record came from, under which licence or permission
 *  - buildings:          the property DIRECTORY. A building is never a rentable result by itself
 *  - external_listings:  permitted references to ads elsewhere (advertiser-submitted or partner feed),
 *                        never collected automatically, expiring unless re-checked
 *  - availability_checks: who confirmed what, how and when. An ad is not a confirmed vacancy
 *  - property_claims:    an owner or manager asks to be linked to a directory building, with evidence
 *  - renter_requests / request_responses / request_messages: renters describe what they need;
 *                        owners answer inside BoardEase, never by seeing the renter's phone number
 *
 * First-party inventory (properties, rooms, listings, tenancies) stays in schema.ts unchanged.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { listings, profiles, properties, rooms } from "./schema";

export const sourceKind = pgEnum("source_kind", ["first_party", "open_data", "partner_feed", "advertiser_submitted", "developer"]);
export const permissionBasis = pgEnum("permission_basis", ["own_platform", "open_licence", "partner_agreement", "advertiser_consent"]);
export const buildingKind = pgEnum("building_kind", [
  "dormitory",
  "boarding_house",
  "apartment_building",
  "condominium",
  "house",
  "mixed_use",
  "other",
]);
export const directoryStatus = pgEnum("directory_status", ["unverified", "active", "closed", "rejected"]);
export const externalStatus = pgEnum("external_status", ["pending_review", "published", "stale", "removed", "rejected"]);
export const rentalTerm = pgEnum("rental_term", ["monthly", "short_term", "both"]);
export const availabilityResult = pgEnum("availability_result", ["available", "unavailable", "unknown"]);
export const checkMethod = pgEnum("check_method", [
  "tenancy_records",
  "owner_confirmed",
  "partner_feed",
  "message_to_advertiser",
  "link_check",
  "moderator_review",
]);
export const claimRole = pgEnum("claim_role", ["owner", "manager"]);
export const claimStatus = pgEnum("claim_status", ["pending", "approved", "rejected", "withdrawn"]);
export const requestStatus = pgEnum("request_status", ["open", "matched", "closed", "expired"]);

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ---------- Sources ---------- */

/** One row per origin of data, with what we are allowed to do with it. Reviewed by a person. */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g. "boardease", "openstreetmap", "partner:dmci-leasing"
  name: text("name").notNull(),
  kind: sourceKind("kind").notNull(),
  basis: permissionBasis("basis").notNull(),
  licence: text("licence").notNull(), // e.g. "ODbL 1.0", "Partner agreement 2026-12-01"
  attribution: text("attribution").notNull(), // shown wherever its records appear
  homepage: text("homepage"),
  automatedAccessAllowed: boolean("automated_access_allowed").notNull().default(false),
  storageAllowed: boolean("storage_allowed").notNull().default(false),
  photosAllowed: boolean("photos_allowed").notNull().default(false),
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: created(),
});

/* ---------- Property directory ---------- */

/** A residential building or compound. Exists independently of whether anything in it is for rent. */
export const buildings = pgTable(
  "buildings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    /** Stable id at the source, e.g. "osm:way/123456". Unique per source, so re-imports never duplicate. */
    externalRef: text("external_ref"),
    name: text("name").notNull(),
    kind: buildingKind("kind").notNull(),
    street: text("street"),
    district: text("district").notNull(),
    city: text("city").notNull().default("Davao City"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    status: directoryStatus("status").notNull().default("unverified"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => profiles.userId),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("buildings_source_ref_uq").on(t.sourceId, t.externalRef),
    index("buildings_district_idx").on(t.district, t.status),
    check("buildings_lat_range", sql`${t.lat} between -90 and 90`),
    check("buildings_lng_range", sql`${t.lng} between -180 and 180`),
  ],
);

/** A BoardEase property (an owner's building, or their unit in a condo) linked to a directory building after an approved claim. */
export const propertyBuildingLinks = pgTable("property_building_links", {
  propertyId: uuid("property_id").primaryKey().references(() => properties.id, { onDelete: "cascade" }),
  buildingId: uuid("building_id").notNull().references(() => buildings.id),
  claimId: uuid("claim_id").references(() => propertyClaims.id),
  createdAt: created(),
});

/* ---------- Permitted external references ---------- */

/**
 * An ad that lives elsewhere, referenced with permission: submitted by its own advertiser, or sent by a
 * partner under agreement. We keep the facts given to us and the link, not copied photos.
 */
export const externalListings = pgTable(
  "external_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    buildingId: uuid("building_id").references(() => buildings.id),
    /** Lower-cased, tracking parameters stripped. One reference per ad. */
    normalizedUrl: text("normalized_url").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    propertyType: text("property_type").notNull(),
    rentalTerm: rentalTerm("rental_term").notNull().default("monthly"),
    /** As advertised, in centavos; null when the ad gives no price. Never estimated. */
    advertisedPriceCents: integer("advertised_price_cents"),
    bedrooms: integer("bedrooms"),
    bedspaces: integer("bedspaces"),
    furnished: boolean("furnished"),
    district: text("district").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    submittedBy: text("submitted_by").references(() => profiles.userId),
    status: externalStatus("status").notNull().default("pending_review"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    /** Published references expire unless re-checked; past this they are shown as stale or hidden. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("external_listings_url_uq").on(t.normalizedUrl),
    index("external_listings_public_idx").on(t.status, t.expiresAt),
    check("external_listings_price_positive", sql`${t.advertisedPriceCents} is null or ${t.advertisedPriceCents} > 0`),
    check("external_listings_published_checked", sql`${t.status} <> 'published' or ${t.lastCheckedAt} is not null`),
  ],
);

/* ---------- Availability ---------- */

/** One check of one thing. Exactly one subject per row. The latest check is what the UI shows. */
export const availabilityChecks = pgTable(
  "availability_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    externalListingId: uuid("external_listing_id").references(() => externalListings.id, { onDelete: "cascade" }),
    result: availabilityResult("result").notNull(),
    freeBeds: integer("free_beds"),
    method: checkMethod("method").notNull(),
    checkedBy: text("checked_by").references(() => profiles.userId),
    note: text("note"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("availability_checks_one_subject", sql`num_nonnulls(${t.listingId}, ${t.roomId}, ${t.externalListingId}) = 1`),
    index("availability_checks_external_idx").on(t.externalListingId, t.checkedAt),
    index("availability_checks_listing_idx").on(t.listingId, t.checkedAt),
  ],
);

/* ---------- Owner claims ---------- */

/**
 * An owner or manager asks to be linked to a directory building. Evidence files live in object storage
 * (keys only here). Never approved automatically: a moderator decides.
 */
export const propertyClaims = pgTable(
  "property_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id").notNull().references(() => buildings.id),
    claimantId: text("claimant_id").notNull().references(() => profiles.userId),
    role: claimRole("role").notNull(),
    /** What the unit or part is, e.g. "Unit 1204, Tower 1" or "Whole building". */
    scope: text("scope").notNull(),
    evidenceKeys: text("evidence_keys").array().notNull(),
    evidenceNote: text("evidence_note"),
    status: claimStatus("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => profiles.userId),
    decisionNote: text("decision_note"),
    createdAt: created(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    check("property_claims_has_evidence", sql`cardinality(${t.evidenceKeys}) >= 1`),
    check("property_claims_decision", sql`${t.status} in ('pending','withdrawn') or (${t.reviewedBy} is not null and ${t.decidedAt} is not null)`),
    uniqueIndex("property_claims_one_open").on(t.buildingId, t.claimantId, t.scope).where(sql`${t.status} = 'pending'`),
    index("property_claims_queue_idx").on(t.status, t.createdAt),
  ],
);

/* ---------- Renter requests ---------- */

/** What a renter is looking for. Public view shows district, budget, type and month only. */
export const renterRequests = pgTable(
  "renter_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    renterId: text("renter_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    district: text("district").notNull(),
    maxBudgetCents: integer("max_budget_cents").notNull(),
    propertyType: text("property_type").notNull(),
    rentalTerm: rentalTerm("rental_term").notNull().default("monthly"),
    moveIn: date("move_in").notNull(),
    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    note: text("note"),
    status: requestStatus("status").notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: created(),
  },
  (t) => [
    check("renter_requests_budget_positive", sql`${t.maxBudgetCents} > 0`),
    index("renter_requests_open_idx").on(t.status, t.district),
  ],
);

/** One answer per owner per request; may point at one of the owner's listings. */
export const requestResponses = pgTable(
  "request_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => renterRequests.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    listingId: uuid("listing_id").references(() => listings.id),
    message: text("message").notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex("request_responses_one_per_owner").on(t.requestId, t.ownerId)],
);

/** The conversation after a response. Only the two participants can read it (enforced in server code). */
export const requestMessages = pgTable(
  "request_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id").notNull().references(() => requestResponses.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull().references(() => profiles.userId),
    body: text("body").notNull(),
    createdAt: created(),
  },
  (t) => [index("request_messages_thread_idx").on(t.responseId, t.createdAt)],
);

/** Saved directory buildings (a renter can follow a building with no listing yet). */
export const buildingFollows = pgTable(
  "building_follows",
  {
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    buildingId: uuid("building_id").notNull().references(() => buildings.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.buildingId] })],
);
