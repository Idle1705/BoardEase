/**
 * Well-known Davao City places offered as quick search suggestions.
 * Coordinates come from OpenStreetMap (Nominatim), checked 2026-11-11.
 */
export type Place = { id: string; label: string; detail: string; lat: number; lng: number };

export const DAVAO_PLACES: Place[] = [
  { id: "um-matina", label: "University of Mindanao", detail: "Matina, Davao City", lat: 7.06715, lng: 125.59493 },
  { id: "addu", label: "Ateneo de Davao University", detail: "Poblacion, Davao City", lat: 7.07181, lng: 125.61342 },
  { id: "usep-obrero", label: "USeP Obrero campus", detail: "Obrero, Davao City", lat: 7.08577, lng: 125.61608 },
  { id: "up-mindanao", label: "UP Mindanao", detail: "Mintal, Davao City", lat: 7.08491, lng: 125.48581 },
  { id: "sm-ecoland", label: "SM City Davao", detail: "Ecoland, Davao City", lat: 7.04875, lng: 125.58881 },
  { id: "bankerohan", label: "Bankerohan Public Market", detail: "Bankerohan, Davao City", lat: 7.06871, lng: 125.60074 },
  { id: "city-hall", label: "Davao City Hall", detail: "Poblacion, Davao City", lat: 7.06445, lng: 125.60772 },
];

export const DEFAULT_PLACE = DAVAO_PLACES[0];
