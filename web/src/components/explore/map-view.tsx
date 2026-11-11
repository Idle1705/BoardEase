"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker, GeoJSONSource } from "maplibre-gl";
import { LocateFixed, Minus, Plus, RotateCw, Search } from "lucide-react";
import { circleBounds, circlePolygon, type LngLat } from "@/lib/geo";
import { formatPeso, formatPesoShort } from "@/lib/format";
import type { ListingResult } from "@/lib/search";
import { cn } from "@/lib/utils";

const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

type Props = {
  centre: LngLat;
  radiusKm: number;
  listings: ListingResult[];
  selectedId: string | null;
  hoveredId: string | null;
  savedIds: string[];
  userLocation: LngLat | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onSearchArea: (centre: LngLat) => void;
  onLocate: () => void;
  locating: boolean;
  /** Extra top padding (px) so floating controls never cover markers when fitting. */
  topInset?: number;
  bottomInset?: number;
  className?: string;
};

type MarkerEntry = { marker: MLMarker; el: HTMLButtonElement };

export function MapView(props: Props) {
  const {
    centre, radiusKm, listings, selectedId, hoveredId, savedIds, userLocation,
    onSelect, onHover, onSearchArea, onLocate, locating, topInset = 120, bottomInset = 24, className,
  } = props;
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, MarkerEntry>());
  const centreMarker = useRef<MLMarker | null>(null);
  const userMarker = useRef<MLMarker | null>(null);
  const handlers = useRef({ onSelect, onHover });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    handlers.current = { onSelect, onHover };
  });

  // Create the map once (and again after a retry)
  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    const markerStore = markers.current;
    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      libRef.current = lib;
      // Worker file copied by scripts/copy-maplibre-worker.mjs
      lib.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      try {
        map = new lib.Map({
          container: box.current,
          style: STYLE_URL,
          center: [centre.lng, centre.lat],
          zoom: 13.4,
          minZoom: 9,
          maxZoom: 18,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: false,
        });
      } catch {
        setFailed(true); // WebGL unavailable
        return;
      }
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;
      const loadTimer = window.setTimeout(() => {
        if (!map?.isStyleLoaded()) setFailed(true);
      }, 15000);
      map.on("load", () => {
        window.clearTimeout(loadTimer);
        if (!map) return;
        map.addSource("radius", { type: "geojson", data: circlePolygon(centre, radiusKm) });
        map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#0f6b52", "fill-opacity": 0.06 } });
        map.addLayer({
          id: "radius-line", type: "line", source: "radius",
          paint: { "line-color": "#0f6b52", "line-opacity": 0.55, "line-width": 1.5, "line-dasharray": [2, 2] },
        });
        setReady(true);
      });
      map.on("error", (e) => {
        // A missing tile is fine; a style that never loads is not.
        if (!map?.isStyleLoaded() && (e?.error as { status?: number } | undefined)?.status) setFailed(true);
      });
      map.on("moveend", (e) => {
        if ((e as { originalEvent?: Event }).originalEvent) setMoved(true);
      });
    })();
    return () => {
      cancelled = true;
      markerStore.forEach((m) => m.marker.remove());
      markerStore.clear();
      centreMarker.current?.remove();
      centreMarker.current = null;
      userMarker.current?.remove();
      userMarker.current = null;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // centre/radius are read once at creation; later changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  // Search centre, radius ring and framing
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    (map.getSource("radius") as GeoJSONSource | undefined)?.setData(circlePolygon(centre, radiusKm));
    if (!centreMarker.current) {
      const el = document.createElement("div");
      el.className = "be-centre";
      el.setAttribute("aria-hidden", "true");
      centreMarker.current = new lib.Marker({ element: el }).setLngLat([centre.lng, centre.lat]).addTo(map);
    } else {
      centreMarker.current.setLngLat([centre.lng, centre.lat]);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(circleBounds(centre, radiusKm), {
      padding: { top: topInset, bottom: bottomInset, left: 24, right: 24 },
      duration: reduce ? 0 : 700,
      maxZoom: 15.5,
    });
    setMoved(false);
  }, [ready, centre, radiusKm, topInset, bottomInset]);

  // Price markers: add, remove, update
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    const store = markers.current;
    const ids = new Set(listings.map((l) => l.id));
    store.forEach((entry, id) => {
      if (!ids.has(id)) {
        entry.marker.remove();
        store.delete(id);
      }
    });
    for (const l of listings) {
      let entry = store.get(l.id);
      if (!entry) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "be-marker";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handlers.current.onSelect(l.id);
        });
        el.addEventListener("mouseenter", () => handlers.current.onHover(l.id));
        el.addEventListener("mouseleave", () => handlers.current.onHover(null));
        el.addEventListener("focus", () => handlers.current.onHover(l.id));
        el.addEventListener("blur", () => handlers.current.onHover(null));
        const marker = new lib.Marker({ element: el, anchor: "bottom" }).setLngLat([l.lng, l.lat]).addTo(map);
        marker.getElement().classList.add("be-marker-wrap");
        entry = { marker, el };
        store.set(l.id, entry);
      }
      entry.el.textContent = formatPesoShort(l.monthlyPrice);
      entry.el.setAttribute("aria-label", `${l.title}, ${formatPeso(l.monthlyPrice)} a month`);
    }
  }, [ready, listings]);

  // Marker states
  useEffect(() => {
    markers.current.forEach((entry, id) => {
      entry.el.dataset.selected = String(id === selectedId);
      entry.el.dataset.hovered = String(id === hoveredId);
      entry.el.dataset.saved = String(savedIds.includes(id));
      entry.el.setAttribute("aria-pressed", String(id === selectedId));
    });
  }, [selectedId, hoveredId, savedIds, listings, ready]);

  // Keep the selected listing in view
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const l = listings.find((x) => x.id === selectedId);
    if (!l) return;
    const p = map.project([l.lng, l.lat]);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const inside = p.x > 40 && p.x < w - 40 && p.y > topInset && p.y < h - bottomInset - 20;
    if (!inside) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.easeTo({ center: [l.lng, l.lat], duration: reduce ? 0 : 500 });
    }
  }, [selectedId, ready, listings, topInset, bottomInset]);

  // The visitor's own location
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    if (!userLocation) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "be-user";
      el.setAttribute("aria-hidden", "true");
      userMarker.current = new lib.Marker({ element: el });
    }
    userMarker.current.setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
  }, [ready, userLocation]);

  const zoom = (d: 1 | -1) => (d > 0 ? mapRef.current?.zoomIn() : mapRef.current?.zoomOut());

  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden bg-[#f2f3f0]", className)}>
      {/* MapLibre sets position: relative on its container, so size it with h-full rather than inset-0 */}
      <div ref={box} className="h-full w-full" role="region" aria-label="Map of listings" />

      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-footnote text-subtle shadow-sm">Loading map…</span>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center">
          <div className="max-w-xs">
            <p className="text-callout font-semibold">The map didn&apos;t load</p>
            <p className="mt-1 text-footnote text-subtle">
              Your connection or browser blocked the map tiles. The listings still work, and distances are measured from your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setRetry((n) => n + 1);
              }}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-body font-medium text-white transition-colors hover:bg-ink-2"
            >
              <RotateCw className="size-4" /> Try the map again
            </button>
          </div>
        </div>
      )}

      {ready && moved && (
        <button
          type="button"
          onClick={() => {
            const c = mapRef.current?.getCenter();
            if (c) onSearchArea({ lat: c.lat, lng: c.lng });
          }}
          className="absolute left-1/2 z-10 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 text-footnote font-semibold shadow-md transition-transform duration-150 hover:-translate-y-px active:translate-y-0 animate-in fade-in slide-in-from-top-1"
          style={{ top: topInset - 8 }}
        >
          <Search className="size-4" /> Search this area
        </button>
      )}

      {ready && (
        <div className="absolute right-4 z-10 flex flex-col gap-2" style={{ bottom: bottomInset + 16 }}>
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
            <MapButton label="Zoom in" onClick={() => zoom(1)}>
              <Plus className="size-[18px]" strokeWidth={1.75} />
            </MapButton>
            <span className="mx-2 h-px bg-hairline" aria-hidden />
            <MapButton label="Zoom out" onClick={() => zoom(-1)}>
              <Minus className="size-[18px]" strokeWidth={1.75} />
            </MapButton>
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-md">
            <MapButton label={locating ? "Finding your location" : "Show my location"} onClick={onLocate} busy={locating}>
              <LocateFixed className={cn("size-[18px]", locating && "animate-pulse text-brand")} strokeWidth={1.75} />
            </MapButton>
          </div>
        </div>
      )}
    </div>
  );
}

function MapButton({ label, onClick, children, busy }: { label: string; onClick: () => void; children: React.ReactNode; busy?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
      onClick={onClick}
      className="grid size-11 place-items-center text-ink transition-colors hover:bg-surface active:bg-surface-2"
    >
      {children}
    </button>
  );
}
