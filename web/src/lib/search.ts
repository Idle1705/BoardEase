import { z } from "zod";
import { DEFAULT_PLACE } from "@/data/places";
import { distanceKm } from "@/lib/geo";
import { PROPERTY_TYPES, type PublicListing } from "@/lib/listing-types";

export const SORTS = ["distance", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABEL: Record<Sort, string> = {
  distance: "Nearest first",
  "price-asc": "Lowest price",
  "price-desc": "Highest price",
};

export const BUDGET_LIMITS = { min: 1000, max: 20000, step: 500 } as const;
export const RADIUS_LIMITS = { min: 0.5, max: 10, step: 0.5 } as const;

export type Filters = {
  place: string;
  lat: number;
  lng: number;
  /** Maximum monthly rent in pesos. */
  budget: number;
  radiusKm: number;
  type: (typeof PROPERTY_TYPES)[number] | "any";
  sort: Sort;
};

export const DEFAULT_FILTERS: Filters = {
  place: `${DEFAULT_PLACE.label}, ${DEFAULT_PLACE.detail}`,
  lat: DEFAULT_PLACE.lat,
  lng: DEFAULT_PLACE.lng,
  budget: 5000,
  radiusKm: 3,
  type: "any",
  sort: "distance",
};

const num = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);

/** Read filters from URL params, falling back to defaults for anything missing or invalid. */
export function parseFilters(params: URLSearchParams): Filters {
  const pick = <T,>(schema: z.ZodType<T>, key: string, fallback: T): T => {
    const raw = params.get(key);
    if (raw === null || raw === "") return fallback;
    const r = schema.safeParse(raw);
    return r.success ? r.data : fallback;
  };
  const lat = pick(num(4, 22), "lat", DEFAULT_FILTERS.lat); // the Philippines spans roughly 4.5-21 N
  const lng = pick(num(115, 128), "lng", DEFAULT_FILTERS.lng);
  const moved = lat !== DEFAULT_FILTERS.lat || lng !== DEFAULT_FILTERS.lng;
  return {
    place: pick(z.string().trim().min(1).max(120), "loc", moved ? "Selected area" : DEFAULT_FILTERS.place),
    lat,
    lng,
    budget: pick(num(BUDGET_LIMITS.min, BUDGET_LIMITS.max), "max", DEFAULT_FILTERS.budget),
    radiusKm: pick(num(RADIUS_LIMITS.min, RADIUS_LIMITS.max), "km", DEFAULT_FILTERS.radiusKm),
    type: pick(z.enum([...PROPERTY_TYPES, "any"]), "type", DEFAULT_FILTERS.type),
    sort: pick(z.enum(SORTS), "sort", DEFAULT_FILTERS.sort),
  };
}

/** Write filters to URL params, leaving defaults out so shared links stay short. */
export function filtersToParams(f: Filters, selectedId?: string | null): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (f.lat !== d.lat || f.lng !== d.lng) {
    p.set("loc", f.place);
    p.set("lat", f.lat.toFixed(5));
    p.set("lng", f.lng.toFixed(5));
  }
  if (f.budget !== d.budget) p.set("max", String(f.budget));
  if (f.radiusKm !== d.radiusKm) p.set("km", String(f.radiusKm));
  if (f.type !== d.type) p.set("type", f.type);
  if (f.sort !== d.sort) p.set("sort", f.sort);
  if (selectedId) p.set("id", selectedId);
  return p;
}

export type ListingResult = PublicListing & { distanceKm: number };

export type SearchOutcome = {
  results: ListingResult[];
  /** Listings that match type and budget but sit outside the radius. */
  outsideRadius: number;
  /** Listings within the radius and type that cost more than the budget. */
  overBudget: number;
};

export function searchListings(listings: PublicListing[], f: Filters): SearchOutcome {
  const centre = { lat: f.lat, lng: f.lng };
  const withDistance = listings.map((l) => ({ ...l, distanceKm: distanceKm(centre, l) }));
  const typed = withDistance.filter((l) => f.type === "any" || l.type === f.type);
  const results = typed.filter((l) => l.monthlyPrice <= f.budget && l.distanceKm <= f.radiusKm);
  const outsideRadius = typed.filter((l) => l.monthlyPrice <= f.budget && l.distanceKm > f.radiusKm).length;
  const overBudget = typed.filter((l) => l.monthlyPrice > f.budget && l.distanceKm <= f.radiusKm).length;

  results.sort((a, b) => {
    if (f.sort === "price-asc") return a.monthlyPrice - b.monthlyPrice || a.distanceKm - b.distanceKm;
    if (f.sort === "price-desc") return b.monthlyPrice - a.monthlyPrice || a.distanceKm - b.distanceKm;
    return a.distanceKm - b.distanceKm;
  });
  return { results, outsideRadius, overBudget };
}
