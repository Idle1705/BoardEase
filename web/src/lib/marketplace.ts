/*
 * Marketplace rules (docs/web/MARKETPLACE.md). Pure functions, shared by the server, the owner portal
 * and the tests. Nothing here touches the database.
 */

export type RoomKind = "single" | "shared" | "unit";
export type ListingStatus = "draft" | "submitted" | "approved" | "rejected" | "published" | "paused" | "archived";

/** Days an owner's "availability is correct" confirmation counts. Older listings leave the finder. */
export const CONFIRM_DAYS = 30;

export const AMENITIES = [
  "Wi-Fi",
  "Air conditioning",
  "Electric fan",
  "Own bathroom",
  "Kitchen access",
  "Laundry area",
  "Water included",
  "Electricity included",
  "Study area",
  "CCTV",
  "Curfew-free",
  "Parking",
] as const;

/**
 * What a room offers to renters.
 *  - shared: rented per bed; each bed is a space. free = capacity - taken.
 *  - single / unit: rented whole; it is one space, free only when nobody holds it.
 * `taken` = active tenancies + beds the owner marked taken. Never below 0 or above the total.
 */
export function roomSpaces(kind: RoomKind, capacity: number, taken: number) {
  const t = Math.max(0, Math.min(Math.floor(taken), capacity));
  if (kind === "shared") return { basis: "bed" as const, total: capacity, free: capacity - t };
  return { basis: kind === "unit" ? ("unit" as const) : ("room" as const), total: 1, free: t > 0 ? 0 : 1 };
}

export const BASIS_LABEL = { bed: "per bed", room: "per room", unit: "whole unit" } as const;

export type ChecklistInput = {
  title: string;
  description: string;
  type: string | null;
  street: string;
  district: string;
  rooms: { rentCents: number }[];
  photos: number;
};

export const MIN_DESCRIPTION = 60;
export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 20;

/** Everything a listing needs before it can be submitted for review (and later published). */
export function publicationChecklist(l: ChecklistInput) {
  return [
    { key: "title", label: "A listing title", ok: l.title.trim().length >= 5 },
    { key: "type", label: "The kind of place (bedspace, dorm, boarding house…)", ok: !!l.type },
    { key: "description", label: `A description of at least ${MIN_DESCRIPTION} characters`, ok: l.description.trim().length >= MIN_DESCRIPTION },
    { key: "location", label: "Street and barangay", ok: !!l.street.trim() && !!l.district.trim() },
    { key: "rooms", label: "At least one room with its monthly rent", ok: l.rooms.length > 0 && l.rooms.every((r) => r.rentCents > 0) },
    { key: "photos", label: `At least ${MIN_PHOTOS} photos you took or are allowed to use`, ok: l.photos >= MIN_PHOTOS },
  ];
}

export const isComplete = (l: ChecklistInput) => publicationChecklist(l).every((c) => c.ok);

type Actor = "owner" | "admin";

/**
 * Allowed lifecycle moves. The owner never approves their own listing; the admin never publishes
 * on the owner's behalf (the owner stays responsible for what goes live).
 */
const MOVES: Record<string, { to: ListingStatus; by: Actor }[]> = {
  draft: [{ to: "submitted", by: "owner" }, { to: "archived", by: "owner" }],
  rejected: [{ to: "submitted", by: "owner" }, { to: "archived", by: "owner" }],
  submitted: [{ to: "approved", by: "admin" }, { to: "rejected", by: "admin" }, { to: "draft", by: "owner" }],
  approved: [{ to: "published", by: "owner" }, { to: "archived", by: "owner" }],
  published: [{ to: "paused", by: "owner" }, { to: "paused", by: "admin" }, { to: "archived", by: "owner" }],
  paused: [{ to: "published", by: "owner" }, { to: "archived", by: "owner" }],
  archived: [{ to: "draft", by: "owner" }],
};

export function canMove(from: ListingStatus, to: ListingStatus, by: Actor) {
  return (MOVES[from] ?? []).some((m) => m.to === to && m.by === by);
}

export function isFresh(confirmedAt: Date | null, now: Date) {
  return !!confirmedAt && now.getTime() - confirmedAt.getTime() <= CONFIRM_DAYS * 86_400_000;
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  submitted: "Waiting for review",
  approved: "Approved, not live yet",
  rejected: "Changes requested",
  published: "Live",
  paused: "Paused",
  archived: "Archived",
};

/* Inquiries */
export const INQUIRY_MIN = 10;
export const INQUIRY_MAX = 1000;
/** Per renter: at most this many new inquiries in any rolling hour, and one open inquiry per listing. */
export const INQUIRIES_PER_HOUR = 5;
export const MESSAGES_PER_HOUR = 30;

/** Philippine mobile numbers as 11 digits starting 09. Accepts +63 / spaces / dashes on input. */
export function normalizePhMobile(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "").replace(/^\+63/, "0").replace(/^63(?=9)/, "0");
  return /^09\d{9}$/.test(digits) ? digits : null;
}

/** Links and phone numbers in a first message are a common spam pattern; we refuse links outright. */
export function looksLikeSpam(text: string) {
  return /https?:\/\/|www\.|\.(com|net|xyz|ru|top|link)\b/i.test(text);
}
