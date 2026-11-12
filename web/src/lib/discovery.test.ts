import { describe, expect, it } from "vitest";
import {
  dedupe,
  discover,
  externalVerification,
  firstPartyVerification,
  normalizeUrl,
  verificationLabel,
  type DiscoveryFilters,
  type DiscoveryItem,
} from "./discovery";

const NOW = new Date("2026-11-12T08:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();
const UM = { lat: 7.06715, lng: 125.59493 };

const src = { key: "test", name: "Test", attribution: "Test fixture" };
const base = (o: Partial<DiscoveryItem>): DiscoveryItem => ({
  kind: "listing",
  id: "x",
  title: "Room",
  lat: UM.lat,
  lng: UM.lng,
  district: "Matina",
  propertyType: "private-room",
  priceCents: 400000,
  rentalTerm: "monthly",
  bedrooms: 1,
  bedspaces: 1,
  furnished: true,
  buildingId: null,
  source: src,
  verification: { state: "confirmed", method: "tenancy_records", checkedAt: daysAgo(1), freeBeds: 1 },
  url: null,
  ...o,
});

const filters = (o: Partial<DiscoveryFilters> = {}): DiscoveryFilters => ({
  centre: UM,
  radiusKm: 3,
  show: { listings: true, external: true, directory: true },
  ...o,
});

describe("buildings are never rentable", () => {
  it("keeps directory buildings out of results and the result count", () => {
    const items = [base({ id: "l1" }), base({ id: "b1", kind: "building", priceCents: null, verification: { state: "directory" } })];
    const out = discover(items, filters());
    expect(out.results.map((r) => r.id)).toEqual(["l1"]);
    expect(out.directory.map((r) => r.id)).toEqual(["b1"]);
  });
  it("hides the directory entirely when its filter is off", () => {
    const items = [base({ id: "b1", kind: "building", priceCents: null, verification: { state: "directory" } })];
    expect(discover(items, filters({ show: { listings: true, external: true, directory: false } })).directory).toHaveLength(0);
  });
  it("does not repeat a building as a bare pin when something in it is for rent", () => {
    const items = [
      base({ id: "b1", kind: "building", priceCents: null, verification: { state: "directory" } }),
      base({ id: "l1", buildingId: "b1" }),
    ];
    expect(discover(items, filters()).directory).toHaveLength(0);
  });
});

describe("advertised is not confirmed, and stale adverts step back", () => {
  it("labels an in-date external reference as advertised, not available", () => {
    const v = externalVerification(daysAgo(2), inDays(12), NOW);
    expect(v.state).toBe("advertised");
    expect(verificationLabel(v, NOW)).toBe("Advertised elsewhere, link checked 2 days ago");
  });
  it("marks an expired reference stale and hides it unless asked", () => {
    const stale = base({ id: "e1", kind: "external", verification: externalVerification(daysAgo(20), daysAgo(6), NOW), url: "https://example.test/ad" });
    expect(stale.verification.state).toBe("stale");
    expect(discover([stale], filters()).results).toHaveLength(0);
    expect(discover([stale], filters()).staleHidden).toBe(1);
    expect(discover([stale], filters({ includeStale: true })).results).toHaveLength(1);
  });
  it("drops a first-party listing whose latest check says unavailable, and stops calling an old check confirmed", () => {
    expect(firstPartyVerification({ result: "unavailable", method: "owner_confirmed", checkedAt: daysAgo(1), freeBeds: 0 }, NOW)).toBeNull();
    expect(firstPartyVerification({ result: "available", method: "owner_confirmed", checkedAt: daysAgo(30), freeBeds: 1 }, NOW)?.state).toBe("unconfirmed");
    expect(firstPartyVerification(null, NOW)).toEqual({ state: "unconfirmed", checkedAt: null });
  });
});

describe("filters", () => {
  const items = [
    base({ id: "cheap", priceCents: 250000, propertyType: "bedspace", bedspaces: 1, bedrooms: null }),
    base({ id: "mid", priceCents: 480000, propertyType: "private-room" }),
    base({ id: "condo", priceCents: 1800000, propertyType: "condominium", bedrooms: 2, furnished: false, rentalTerm: "both" }),
    base({ id: "noprice", kind: "external", priceCents: null, verification: externalVerification(daysAgo(1), inDays(13), NOW), url: "https://example.test/x" }),
    base({ id: "far", priceCents: 300000, lat: 7.1, lng: 125.635 }), // Lanang, ~5.8 km away
    base({ id: "short", priceCents: 150000, rentalTerm: "short_term" }),
  ];
  const ids = (f: Partial<DiscoveryFilters>) => discover(items, filters(f)).results.map((r) => r.id).sort();

  it("applies a price range and never lets an unknown price through a price filter", () => {
    expect(ids({ maxPrice: 5000 })).toEqual(["cheap", "mid", "short"]);
    expect(ids({ minPrice: 4000, maxPrice: 20000 })).toEqual(["condo", "mid"]);
  });
  it("applies distance", () => {
    expect(ids({}).includes("far")).toBe(false);
    expect(ids({ radiusKm: 7 }).includes("far")).toBe(true);
  });
  it("applies type, bedrooms, bedspaces, term and furnished", () => {
    expect(ids({ types: ["bedspace"] })).toEqual(["cheap"]);
    expect(ids({ minBedrooms: 2 })).toEqual(["condo"]);
    expect(ids({ minBedspaces: 2 })).toEqual([]);
    expect(ids({ minBedspaces: 1 })).toEqual(["cheap", "condo", "mid", "noprice", "short"]);
    expect(ids({ term: "short_term" })).toEqual(["condo", "short"]); // "both" offers short-term too
    expect(ids({ furnished: "unfurnished" })).toEqual(["condo"]);
  });
  it("lets the visitor choose sources", () => {
    expect(ids({ show: { listings: false, external: true, directory: false } })).toEqual(["noprice"]);
    expect(ids({ show: { listings: true, external: false, directory: false } })).not.toContain("noprice");
  });
  it("sorts nearest first", () => {
    const out = discover([base({ id: "a", lat: 7.075, lng: 125.6 }), base({ id: "b" })], filters()).results.map((r) => r.id);
    expect(out).toEqual(["b", "a"]);
  });
});

describe("deduplication", () => {
  const ext = (id: string, o: Partial<DiscoveryItem> = {}) =>
    base({ id, kind: "external", buildingId: "b1", verification: externalVerification(daysAgo(3), inDays(11), NOW), url: `https://example.test/${id}`, ...o });

  it("prefers the BoardEase listing over a matching external ad in the same building", () => {
    const out = dedupe([base({ id: "own", buildingId: "b1" }), ext("ad")]);
    expect(out.map((i) => i.id)).toEqual(["own"]);
  });
  it("keeps the most recently checked of two matching ads", () => {
    const older = ext("older", { verification: externalVerification(daysAgo(9), inDays(5), NOW) });
    const newer = ext("newer", { verification: externalVerification(daysAgo(1), inDays(13), NOW) });
    expect(dedupe([older, newer]).map((i) => i.id)).toEqual(["newer"]);
  });
  it("keeps genuinely different units in one building", () => {
    expect(dedupe([ext("one-br", { bedrooms: 1, priceCents: 1500000 }), ext("two-br", { bedrooms: 2, priceCents: 2200000 })])).toHaveLength(2);
  });
  it("normalises adverts' URLs so one ad is stored once", () => {
    expect(normalizeUrl("https://www.Facebook.com/groups/123/posts/456/?mibextid=abc&fbclid=XYZ#c")).toBe("https://facebook.com/groups/123/posts/456");
    expect(normalizeUrl("https://m.facebook.com/groups/123/posts/456")).toBe("https://facebook.com/groups/123/posts/456");
    expect(normalizeUrl("https://example.test/ad?b=2&a=1&utm_source=x")).toBe("https://example.test/ad?a=1&b=2");
  });
});

describe("labels never claim more than the data", () => {
  it("shows free beds only when known", () => {
    expect(verificationLabel({ state: "confirmed", method: "tenancy_records", checkedAt: daysAgo(0), freeBeds: 2 }, NOW)).toBe("Available, confirmed today (2 free beds)");
    expect(verificationLabel({ state: "confirmed", method: "owner_confirmed", checkedAt: daysAgo(1), freeBeds: null }, NOW)).toBe("Available, confirmed yesterday");
    expect(verificationLabel({ state: "directory" }, NOW)).toBe("Building only, no rooms listed");
  });
});
