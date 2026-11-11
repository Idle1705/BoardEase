export type LngLat = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** GeoJSON polygon approximating a circle, for the search-radius overlay. */
export function circlePolygon(centre: LngLat, radiusKm: number, steps = 96) {
  const coords: [number, number][] = [];
  const latR = radiusKm / 110.574;
  const lngR = radiusKm / (111.32 * Math.cos((centre.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    coords.push([centre.lng + lngR * Math.cos(t), centre.lat + latR * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

/** Bounding box [[west, south], [east, north]] around a circle. */
export function circleBounds(centre: LngLat, radiusKm: number): [[number, number], [number, number]] {
  const latR = radiusKm / 110.574;
  const lngR = radiusKm / (111.32 * Math.cos((centre.lat * Math.PI) / 180));
  return [
    [centre.lng - lngR, centre.lat - latR],
    [centre.lng + lngR, centre.lat + latR],
  ];
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 20) * 50)} m`;
  return `${km.toFixed(1)} km`;
}
