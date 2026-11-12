"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker, GeoJSONSource } from "maplibre-gl";
import { circleBounds, circlePolygon, type LngLat } from "@/lib/geo";
import { formatPesoShort } from "@/lib/format";
import type { DiscoveryItem } from "@/lib/discovery";

const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

/*
 * Discovery prototype map. Three marks, so a building is never mistaken for a room:
 *  - BoardEase listing: solid price pin (the finder's pin)
 *  - external advert:   outlined price pin, "Ad" when the advert gives no price
 *  - directory building: small dot, no price
 */
const PIN_LISTING = "be-marker";
const PIN_EXTERNAL = "be-marker !bg-porcelain ring-[1.5px] ring-clay/60 ring-inset";
const PIN_BUILDING =
  "block size-3.5 rounded-full border-2 border-white bg-ink/55 shadow-[0_1px_4px_rgb(32_42_40/0.35)] transition-transform hover:scale-125 focus-visible:scale-125";

type Mark = DiscoveryItem & { distanceKm: number };

export function DiscoverMap({
  centre,
  radiusKm,
  results,
  directory,
  selectedId,
  onSelect,
}: {
  centre: LngLat;
  radiusKm: number;
  results: Mark[];
  directory: Mark[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, { marker: MLMarker; el: HTMLElement }>());
  const select = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    let map: MLMap | null = null;
    let cancelled = false;
    const store = markers.current;
    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      lib.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      libRef.current = lib;
      map = new lib.Map({ container: box.current, style: STYLE_URL, center: [centre.lng, centre.lat], zoom: 13, attributionControl: false, dragRotate: false });
      map.addControl(new lib.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-left");
      mapRef.current = map;
      map.on("load", () => {
        map!.addSource("radius", { type: "geojson", data: circlePolygon(centre, radiusKm) });
        map!.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#b44630", "fill-opacity": 0.05 } });
        map!.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#b44630", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [2, 2] } });
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      store.forEach((m) => m.marker.remove());
      store.clear();
      map?.remove();
    };
    // created once; centre and radius changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("radius") as GeoJSONSource | undefined)?.setData(circlePolygon(centre, radiusKm));
    map.fitBounds(circleBounds(centre, radiusKm), { padding: 32, duration: 0, maxZoom: 15 });
  }, [ready, centre, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    const want = new Map<string, Mark>([...directory, ...results].map((m) => [m.id, m]));
    markers.current.forEach((m, id) => {
      if (!want.has(id)) {
        m.marker.remove();
        markers.current.delete(id);
      }
    });
    for (const m of want.values()) {
      let entry = markers.current.get(m.id);
      if (!entry) {
        // MapLibre owns the outer element (its classes position the marker); our look lives on an inner span
        const el = document.createElement("button");
        el.type = "button";
        el.className = "block rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-clay";
        el.appendChild(document.createElement("span"));
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          select.current(m.id);
        });
        const marker = new lib.Marker({ element: el, anchor: m.kind === "building" ? "center" : "bottom" }).setLngLat([m.lng, m.lat]).addTo(map);
        entry = { marker, el };
        markers.current.set(m.id, entry);
      }
      const el = entry.el;
      const face = el.firstElementChild as HTMLElement;
      if (m.kind === "building") {
        face.className = PIN_BUILDING;
        face.textContent = "";
        el.setAttribute("aria-label", `${m.title}, building in the directory, no rooms listed`);
      } else {
        face.className = m.kind === "external" ? PIN_EXTERNAL : PIN_LISTING;
        face.textContent = m.priceCents == null ? "Ad" : formatPesoShort(m.priceCents / 100);
        el.setAttribute(
          "aria-label",
          `${m.title}, ${m.priceCents == null ? "price not given" : `${formatPesoShort(m.priceCents / 100)} a month`}, ${m.kind === "external" ? "advertised elsewhere" : "listed on BoardEase"}`,
        );
      }
      face.dataset.selected = String(m.id === selectedId);
      (entry.marker.getElement() as HTMLElement).style.zIndex = m.id === selectedId ? "5" : m.kind === "building" ? "1" : "2";
    }
  }, [ready, results, directory, selectedId]);

  return <div ref={box} className="size-full" role="region" aria-label="Map of rooms, adverts and buildings" />;
}
