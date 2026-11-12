/*
 * Discovery rules (docs/web/DISCOVERY-FEASIBILITY.md). Pure functions, so they are unit-tested
 * (discovery.test.ts) and the same rules run on the server and in the browser.
 *
 *  - Three kinds of result: a BoardEase listing, an external reference, a directory building.
 *  - Only listings and external references are rentable. A building never counts as a result.
 *  - An external reference is "advertised", not "confirmed": it shows its source, when it was last
 *    checked, and becomes "stale" (hidden by default) when its check expires.
 *  - Nothing here invents a price, a vacancy count or a verified badge: missing data stays missing.
 */
import { distanceKm, type LngLat } from "./geo";

export type ResultKind = "listing" | "external" | "building";
export type RentalTerm = "monthly" | "short_term" | "both";
export type Verification =
  | { state: "confirmed"; method: string; checkedAt: string; freeBeds: number | null } // first party, latest check says available
  | { state: "unconfirmed"; checkedAt: string | null } // first party, no recent confirmation
  | { state: "advertised"; checkedAt: string; expiresAt: string } // external, within its check window
  | { state: "stale"; checkedAt: string | null; expiresAt: string } // external, past its window
  | { state: "directory" }; // a building: exists, nothing known about vacancies

export type DiscoveryItem = {
  kind: ResultKind;
  id: string;
  title: string;
  lat: number;
  lng: number;
  district: string;
  /** For listings and references: what is offered. For buildings: the building kind. */
  propertyType: string;
  priceCents: number | null;
  rentalTerm: RentalTerm | null;
  bedrooms: number | null;
  bedspaces: number | null;
  furnished: boolean | null;
  buildingId: string | null;
  source: { key: string; name: string; attribution: string };
  verification: Verification;
  /** Where the original ad lives (external references only). */
  url: string | null;
};

export type DiscoveryFilters = {
  centre: LngLat;
  radiusKm: number;
  show: { listings: boolean; external: boolean; directory: boolean };
  minPrice?: number; // pesos per month
  maxPrice?: number;
  types?: string[];
  minBedrooms?: number;
  minBedspaces?: number;
  term?: RentalTerm | "any";
  furnished?: "any" | "furnished" | "unfurnished";
  includeStale?: boolean;
};

/** How long a first-party confirmation counts as current. */
export const CONFIRMATION_DAYS = 14;
const DAY = 86_400_000;

export const isRentable = (i: DiscoveryItem) => i.kind !== "building";

/** First-party verification from the latest availability check, if any. */
export function firstPartyVerification(
  latest: { result: "available" | "unavailable" | "unknown"; method: string; checkedAt: string; freeBeds: number | null } | null,
  now: Date,
): Verification | null {
  if (!latest) return { state: "unconfirmed", checkedAt: null };
  if (latest.result === "unavailable") return null; // not a result at all
  const fresh = now.getTime() - Date.parse(latest.checkedAt) <= CONFIRMATION_DAYS * DAY;
  if (latest.result === "available" && fresh) return { state: "confirmed", method: latest.method, checkedAt: latest.checkedAt, freeBeds: latest.freeBeds };
  return { state: "unconfirmed", checkedAt: latest.checkedAt };
}

/** External reference state from its stored timestamps. */
export function externalVerification(lastCheckedAt: string | null, expiresAt: string, now: Date): Verification {
  if (lastCheckedAt && Date.parse(expiresAt) > now.getTime()) return { state: "advertised", checkedAt: lastCheckedAt, expiresAt };
  return { state: "stale", checkedAt: lastCheckedAt, expiresAt };
}

/** Lower-case host, no tracking parameters, no fragment, no trailing slash. Used as the dedupe key for references. */
export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  for (const k of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mibextid|ref|ref_src|igshid|__cft__|__tn__|rdid|share_url)/i.test(k)) u.searchParams.delete(k);
  }
  u.searchParams.sort();
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return `${u.protocol}//${u.hostname}${path}${u.searchParams.size ? `?${u.searchParams}` : ""}`;
}

/**
 * Collapse duplicates:
 *  - an external reference that matches a BoardEase listing in the same building, type and price is dropped
 *    (the first-party listing wins, it is the verified one);
 *  - two references in one building with the same type, bedrooms and price keep the most recently checked;
 *  - a building that has any rentable result is not shown again as a bare directory pin.
 */
export function dedupe(items: DiscoveryItem[]): DiscoveryItem[] {
  const key = (i: DiscoveryItem) => [i.buildingId, i.propertyType, i.priceCents, i.bedrooms ?? ""].join("|");
  const firstParty = new Set(items.filter((i) => i.kind === "listing" && i.buildingId).map(key));
  const bestExternal = new Map<string, DiscoveryItem>();
  const out: DiscoveryItem[] = [];
  for (const i of items) {
    if (i.kind !== "external") continue;
    if (i.buildingId && firstParty.has(key(i))) continue;
    if (!i.buildingId) {
      out.push(i);
      continue;
    }
    const k = key(i);
    const prev = bestExternal.get(k);
    const at = (x: DiscoveryItem) => ("checkedAt" in x.verification && x.verification.checkedAt ? Date.parse(x.verification.checkedAt) : 0);
    if (!prev || at(i) > at(prev)) bestExternal.set(k, i);
  }
  const rentableBuildings = new Set(
    [...items.filter((i) => i.kind === "listing"), ...bestExternal.values(), ...out].map((i) => i.buildingId).filter(Boolean),
  );
  return [
    ...items.filter((i) => i.kind === "listing"),
    ...bestExternal.values(),
    ...out,
    ...items.filter((i) => i.kind === "building" && !rentableBuildings.has(i.id)),
  ];
}

export type DiscoveryOutcome = {
  /** Rentable results (listings + references), nearest first. */
  results: (DiscoveryItem & { distanceKm: number })[];
  /** Directory buildings shown for context only, never counted as results. */
  directory: (DiscoveryItem & { distanceKm: number })[];
  /** External references hidden because their check expired. */
  staleHidden: number;
};

export function discover(items: DiscoveryItem[], f: DiscoveryFilters): DiscoveryOutcome {
  const withDist = dedupe(items).map((i) => ({ ...i, distanceKm: distanceKm(f.centre, i) }));
  const inRange = withDist.filter((i) => i.distanceKm <= f.radiusKm);
  let staleHidden = 0;

  const results = inRange.filter((i) => {
    if (i.kind === "building") return false;
    if (i.kind === "listing" && !f.show.listings) return false;
    if (i.kind === "external" && !f.show.external) return false;
    if (i.verification.state === "stale" && !f.includeStale) {
      staleHidden++;
      return false;
    }
    if (f.types?.length && !f.types.includes(i.propertyType)) return false;
    // Price filters only keep results whose price is known; an unknown price never passes a price filter
    const peso = i.priceCents == null ? null : i.priceCents / 100;
    if (f.minPrice != null && (peso == null || peso < f.minPrice)) return false;
    if (f.maxPrice != null && (peso == null || peso > f.maxPrice)) return false;
    if (f.minBedrooms != null && (i.bedrooms ?? 0) < f.minBedrooms) return false;
    if (f.minBedspaces != null && (i.bedspaces ?? 0) < f.minBedspaces) return false;
    if (f.term && f.term !== "any" && i.rentalTerm !== f.term && i.rentalTerm !== "both") return false;
    if (f.furnished === "furnished" && i.furnished !== true) return false;
    if (f.furnished === "unfurnished" && i.furnished !== false) return false;
    return true;
  });

  const directory = f.show.directory ? inRange.filter((i) => i.kind === "building") : [];
  const order = (a: { distanceKm: number }, b: { distanceKm: number }) => a.distanceKm - b.distanceKm;
  return { results: results.sort(order), directory: directory.sort(order), staleHidden };
}

/** The label a person reads on a result. Plain words, never a badge that claims more than the data. */
export function verificationLabel(v: Verification, now: Date): string {
  const ago = (iso: string) => {
    const d = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / DAY));
    return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  };
  switch (v.state) {
    case "confirmed":
      return `Available, confirmed ${ago(v.checkedAt)}${v.freeBeds != null ? ` (${v.freeBeds} free ${v.freeBeds === 1 ? "bed" : "beds"})` : ""}`;
    case "unconfirmed":
      return v.checkedAt ? `Not confirmed since ${ago(v.checkedAt)}` : "Availability not confirmed yet";
    case "advertised":
      return `Advertised elsewhere, link checked ${ago(v.checkedAt)}`;
    case "stale":
      return "Advert may be out of date";
    case "directory":
      return "Building only, no rooms listed";
  }
}
