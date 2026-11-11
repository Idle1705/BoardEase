/*
 * BoardEase database schema (Neon Postgres, Drizzle ORM).
 *
 * Three areas, kept apart on purpose:
 *  1. Marketplace: properties, rooms, listings, photos, favourites, inquiries, reports.
 *  2. Management (owner-private): tenants, tenancies, utility readings, bills, payments.
 *  3. Accounts: profiles keyed by the Neon Auth user id (Better Auth, schema `neon_auth`).
 *
 * Money is integer centavos. Exact addresses and exact coordinates live only on `properties`
 * and are never selected by public queries (see src/server/listings.ts).
 * Every management row carries `owner_id` so each query can be scoped to the signed-in owner.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["renter", "owner", "admin"]);
export const propertyType = pgEnum("property_type", ["bedspace", "dormitory", "boarding-house", "private-room", "apartment"]);
export const roomKind = pgEnum("room_kind", ["single", "shared", "unit"]);
export const listingStatus = pgEnum("listing_status", ["draft", "published", "paused", "archived"]);
export const moderationStatus = pgEnum("moderation_status", ["pending", "approved", "rejected"]);
export const verificationStatus = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const inquiryStatus = pgEnum("inquiry_status", ["new", "replied", "viewing-set", "closed"]);
export const reportStatus = pgEnum("report_status", ["open", "reviewing", "resolved", "dismissed"]);
export const bathroomKind = pgEnum("bathroom_kind", ["private", "shared"]);

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ---------- Accounts ---------- */

/** One row per Neon Auth user. `user_id` is the Better Auth user id (text). */
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  role: userRole("role").notNull().default("renter"),
  displayName: text("display_name").notNull(),
  phone: char("phone", { length: 11 }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
});

export const ownerVerifications = pgTable(
  "owner_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    status: verificationStatus("status").notNull().default("pending"),
    /** Object-storage key of the uploaded document; never a public URL. */
    documentKey: text("document_key"),
    reviewedBy: text("reviewed_by").references(() => profiles.userId),
    reviewNote: text("review_note"),
    createdAt: created(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("owner_verifications_owner_idx").on(t.ownerId)],
);

/* ---------- Marketplace ---------- */

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId, { onDelete: "restrict" }),
    name: text("name").notNull(),
    // Public: street and district only, never a house number
    street: text("street").notNull(),
    district: text("district").notNull(),
    city: text("city").notNull().default("Davao City"),
    // Private: shared with a renter only after a viewing is agreed
    exactAddress: text("exact_address"),
    exactLat: doublePrecision("exact_lat"),
    exactLng: doublePrecision("exact_lng"),
    // Public approximate point, offset by the app when the owner saves
    publicLat: doublePrecision("public_lat").notNull(),
    publicLng: doublePrecision("public_lng").notNull(),
    shareExactLocation: boolean("share_exact_location").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("properties_owner_idx").on(t.ownerId),
    check("properties_lat_range", sql`${t.publicLat} between -90 and 90`),
    check("properties_lng_range", sql`${t.publicLng} between -180 and 180`),
  ],
);

/** A rentable unit inside a property; the desktop app's Room (SingleRoom / SharedRoom). */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    label: text("label").notNull(), // the desktop app's room_number
    kind: roomKind("kind").notNull(),
    capacity: integer("capacity").notNull(),
    baseRentCents: integer("base_rent_cents").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("rooms_property_label_uq").on(t.propertyId, sql`lower(${t.label})`),
    index("rooms_owner_idx").on(t.ownerId),
    check("rooms_capacity_positive", sql`${t.capacity} >= 1`),
    check("rooms_shared_capacity", sql`${t.kind} <> 'shared' or ${t.capacity} in (2, 3)`),
    check("rooms_single_capacity", sql`${t.kind} <> 'single' or ${t.capacity} = 1`),
    check("rooms_rent_non_negative", sql`${t.baseRentCents} >= 0`),
  ],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: propertyType("type").notNull(),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    bathroom: bathroomKind("bathroom").notNull(),
    sizeSqm: integer("size_sqm"),
    furnished: boolean("furnished").notNull().default(false),
    utilitiesNote: text("utilities_note").notNull().default(""),
    minimumStayMonths: integer("minimum_stay_months").notNull().default(1),
    amenities: text("amenities").array().notNull().default(sql`'{}'::text[]`),
    status: listingStatus("status").notNull().default("draft"),
    moderation: moderationStatus("moderation").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("listings_public_idx").on(t.status, t.moderation),
    index("listings_owner_idx").on(t.ownerId),
    check("listings_price_positive", sql`${t.monthlyPriceCents} > 0`),
  ],
);

/** Photos live in object storage (R2 or Vercel Blob); the database keeps only the key. */
export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("listing_photos_listing_idx").on(t.listingId, t.position)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] })],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    renterId: text("renter_id").notNull().references(() => profiles.userId),
    message: text("message").notNull(),
    preferredViewingDate: date("preferred_viewing_date"),
    status: inquiryStatus("status").notNull().default("new"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("inquiries_owner_idx").on(t.ownerId, t.status), index("inquiries_renter_idx").on(t.renterId)],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  reporterId: text("reporter_id").notNull().references(() => profiles.userId),
  reason: text("reason").notNull(),
  details: text("details"),
  status: reportStatus("status").notNull().default("open"),
  handledBy: text("handled_by").references(() => profiles.userId),
  createdAt: created(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/* ---------- Management (owner-private) ---------- */

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    name: text("name").notNull(),
    contactNumber: char("contact_number", { length: 11 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    // Desktop rules: one name and one contact number per tenant, per owner
    uniqueIndex("tenants_owner_name_uq").on(t.ownerId, sql`lower(${t.name})`),
    uniqueIndex("tenants_owner_contact_uq").on(t.ownerId, t.contactNumber),
    check("tenants_contact_digits", sql`${t.contactNumber} ~ '^[0-9]{11}$'`),
  ],
);

/** Who lives in which room, and when. Ending a tenancy replaces the desktop app's Transfer / Remove. */
export const tenancies = pgTable(
  "tenancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    roomId: uuid("room_id").notNull().references(() => rooms.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: created(),
  },
  (t) => [
    index("tenancies_room_idx").on(t.roomId),
    uniqueIndex("tenancies_one_active_per_tenant").on(t.tenantId).where(sql`${t.endDate} is null`),
  ],
);

export const utilityReadings = pgTable(
  "utility_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    roomId: uuid("room_id").notNull().references(() => rooms.id),
    month: char("month", { length: 7 }).notNull(),
    electricityKwh: numeric("electricity_kwh", { precision: 10, scale: 2 }).notNull(),
    waterCubicM: numeric("water_cubic_m", { precision: 10, scale: 2 }).notNull(),
    electricityRate: numeric("electricity_rate", { precision: 10, scale: 4 }).notNull(),
    waterRate: numeric("water_rate", { precision: 10, scale: 4 }).notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex("utility_readings_room_month_uq").on(t.roomId, t.month)],
);

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    roomId: uuid("room_id").notNull().references(() => rooms.id),
    readingId: uuid("reading_id").references(() => utilityReadings.id),
    month: char("month", { length: 7 }).notNull(),
    rentCents: integer("rent_cents").notNull(),
    electricityCents: integer("electricity_cents").notNull(),
    waterCents: integer("water_cents").notNull(),
    dueDate: date("due_date").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("bills_tenant_month_uq").on(t.tenantId, t.month),
    index("bills_owner_month_idx").on(t.ownerId, t.month),
    check("bills_amounts_non_negative", sql`${t.rentCents} >= 0 and ${t.electricityCents} >= 0 and ${t.waterCents} >= 0`),
  ],
);

/** Append-only, like the desktop ledger: a correction is a new row, never an edit. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => profiles.userId),
    billId: uuid("bill_id").notNull().references(() => bills.id),
    amountCents: integer("amount_cents").notNull(),
    paidOn: date("paid_on").notNull(),
    source: text("source").notNull().default("Payment"),
    createdAt: created(),
  },
  (t) => [index("payments_bill_idx").on(t.billId), check("payments_positive", sql`${t.amountCents} > 0`)],
);
