export const PROPERTY_TYPES = [
  "bedspace",
  "dormitory",
  "boarding-house",
  "private-room",
  "apartment",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  bedspace: "Bedspace",
  dormitory: "Dormitory",
  "boarding-house": "Boarding house",
  "private-room": "Private room",
  apartment: "Apartment",
};

export type ListingPhoto = {
  /** Base path without size suffix, e.g. /demo/photos/photo-f123 */
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** A listing as the public marketplace sees it. Never carries owner finances or tenant data. */
export type PublicListing = {
  id: string;
  /** True for demonstration records. The UI must badge these. */
  demo: boolean;
  title: string;
  type: PropertyType;
  /** Street and district only, never a house number. */
  street: string;
  district: string;
  city: string;
  /** Approximate point (owner has not shared the exact pin). */
  lat: number;
  lng: number;
  locationPrecision: "approximate" | "exact";
  monthlyPrice: number;
  /** People who can live in the unit. */
  capacity: number;
  bathroom: "private" | "shared";
  sizeSqm?: number;
  furnished: boolean;
  utilities: string;
  minimumStayMonths: number;
  amenities: string[];
  description: string;
  photos: ListingPhoto[];
};
