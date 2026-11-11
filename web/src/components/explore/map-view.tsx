"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as MLMap,
  Marker as MLMarker,
  GeoJSONSource,
} from "maplibre-gl";
import { LocateFixed, Minus, Plus, RotateCw, Search } from "lucide-react";
import { circleBounds, circlePolygon, type LngLat } from "@/lib/geo";
import { formatPeso, formatPesoShort } from "@/lib/format";
import type { ListingResult } from "@/lib/search";
import { EASE_OUT, gsap, reducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/positron";

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
  /** Width (px) covered by a floating panel on the right; pins and controls stay clear of it */
  rightInset?: number;
  className?: string;
};

type MarkerEntry = { marker: MLMarker; el: HTMLButtonElement };

export function MapView(props: Props) {
  const {
    centre,
    radiusKm,
    listings,
    selectedId,
    hoveredId,
    savedIds,
    userLocation,
    onSelect,
    onHover,
    onSearchArea,
    onLocate,
    locating,
    topInset = 120,
    bottomInset = 24,
    rightInset = 0,
    className,
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
  const drawnRadius = useRef(radiusKm);
  const drawnCentre = useRef(centre);
  const lastSelected = useRef<string | null>(null);
  const selectedRef = useRef(selectedId);

  /**
   * Pins that would cover each other are nudged apart (selected pin keeps its spot), so every
   * price stays readable. Locations are approximate anyway, so a small nudge does not mislead.
   */
  const declutter = useRef(() => {});
  const refit = useRef<() => void>(() => {});

  // The map may be created while hidden (phone List view). When its box first gets a size,
  // resize the canvas and frame the search area again, so it never opens zoomed to a zero-size box.
  useEffect(() => {
    const el = box.current;
    if (!el || !ready) return;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || el.clientWidth === 0) return;
      const canvas = map.getCanvas();
      const stale = Math.abs(canvas.clientWidth - el.clientWidth) > 1 || Math.abs(canvas.clientHeight - el.clientHeight) > 1;
      if (!stale) return;
      map.resize();
      refit.current();
      // DOM pins placed while the map was hidden keep stale screen positions: re-place them
      requestAnimationFrame(() => {
        markers.current.forEach(({ marker }) => marker.setLngLat(marker.getLngLat()));
        centreMarker.current?.setLngLat(centreMarker.current.getLngLat());
        declutter.current();
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);
  useEffect(() => {
    selectedRef.current = selectedId;
  });
  useEffect(() => {
    declutter.current = () => {
      const map = mapRef.current;
      if (!map) return;
      const entries = [...markers.current.entries()].map(([id, e]) => ({
        id,
        e,
        p: map.project(e.marker.getLngLat()),
      }));
      entries.sort((a, b) =>
        a.id === selectedRef.current
          ? -1
          : b.id === selectedRef.current
            ? 1
            : b.p.y - a.p.y,
      );
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const H = 30,
        GAP = 4;
      const tries: [number, number][] = [
        [0, 0],
        [0, -(H + GAP)],
        [0, H + GAP],
        [-1, 0],
        [1, 0],
        [0, -2 * (H + GAP)],
        [0, 2 * (H + GAP)],
      ];
      for (const { e, p } of entries) {
        const w = e.el.offsetWidth || 56;
        let chosen: [number, number] = [0, 0];
        for (const [tx, ty] of tries) {
          const ox = tx * (w + GAP),
            oy = ty;
          const r = { x: p.x - w / 2 + ox, y: p.y - H + oy, w, h: H };
          if (
            !placed.some(
              (q) =>
                r.x < q.x + q.w + GAP &&
                r.x + r.w + GAP > q.x &&
                r.y < q.y + q.h + GAP &&
                r.y + r.h + GAP > q.y,
            )
          ) {
            chosen = [ox, oy];
            placed.push(r);
            break;
          }
        }
        e.marker.setOffset(chosen);
      }
    };
  }, []);

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
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: false,
        });
      } catch {
        setFailed(true); // WebGL unavailable
        return;
      }
      {
        // Desktop: credits sit bottom-left, where the floating listing panel never covers them
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        map.addControl(new lib.AttributionControl({ compact: true }), wide ? "bottom-left" : "bottom-right");
      }
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;
      const loadTimer = window.setTimeout(() => {
        if (!map?.isStyleLoaded()) setFailed(true);
      }, 15000);
      map.on("load", () => {
        window.clearTimeout(loadTimer);
        if (!map) return;
        map.addSource("radius", {
          type: "geojson",
          data: circlePolygon(centre, radiusKm),
        });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#202a28", "fill-opacity": 0.035 },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: {
            "line-color": "#202a28",
            "line-opacity": 0.4,
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
        setReady(true);
      });
      map.on("error", (e) => {
        // A missing tile is fine; a style that never loads is not.
        if (
          !map?.isStyleLoaded() &&
          (e?.error as { status?: number } | undefined)?.status
        )
          setFailed(true);
      });
      map.on("zoomend", () => declutter.current());
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
    // The distance ring grows or shrinks to its new size instead of jumping
    const source = map.getSource("radius") as GeoJSONSource | undefined;
    const sameCentre =
      drawnCentre.current.lat === centre.lat &&
      drawnCentre.current.lng === centre.lng;
    drawnCentre.current = centre;
    let ring: gsap.core.Tween | null = null;
    if (sameCentre && drawnRadius.current !== radiusKm && !reducedMotion()) {
      const r = { km: drawnRadius.current };
      ring = gsap.to(r, {
        km: radiusKm,
        duration: 0.7,
        ease: EASE_OUT,
        onUpdate: () => {
          drawnRadius.current = r.km;
          source?.setData(circlePolygon(centre, r.km));
        },
      });
    } else {
      drawnRadius.current = radiusKm;
      source?.setData(circlePolygon(centre, radiusKm));
    }
    if (!centreMarker.current) {
      const el = document.createElement("div");
      el.className = "be-centre";
      el.setAttribute("aria-hidden", "true");
      centreMarker.current = new lib.Marker({ element: el })
        .setLngLat([centre.lng, centre.lat])
        .addTo(map);
    } else {
      centreMarker.current.setLngLat([centre.lng, centre.lat]);
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const frameSearch = (instant: boolean) =>
      map.fitBounds(circleBounds(centre, radiusKm), {
        padding: { top: topInset, bottom: bottomInset, left: 24, right: 24 },
        duration: instant || reduce ? 0 : 700,
        maxZoom: 15.5,
      });
    refit.current = () => frameSearch(true);
    if (map.getContainer().clientWidth > 0) {
      map.resize(); // in case the canvas was measured while hidden
      frameSearch(false);
    }
    setMoved(false);
    return () => {
      ring?.kill();
    };
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
        store.delete(id);
        // Leaving pins shrink away, so you can see which listings a filter removed
        if (reducedMotion()) entry.marker.remove();
        else
          entry.el.animate(
            [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(0.6)" },
            ],
            { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          ).onfinish = () => entry.marker.remove();
      }
    });
    let arriving = 0;
    requestAnimationFrame(() => declutter.current());
    for (const l of listings) {
      let entry = store.get(l.id);
      if (!entry) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "be-marker";
        el.dataset.listingId = l.id;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handlers.current.onSelect(l.id);
        });
        el.addEventListener("mouseenter", () => handlers.current.onHover(l.id));
        el.addEventListener("mouseleave", () => handlers.current.onHover(null));
        el.addEventListener("focus", () => handlers.current.onHover(l.id));
        el.addEventListener("blur", () => handlers.current.onHover(null));
        const marker = new lib.Marker({ element: el, anchor: "bottom" })
          .setLngLat([l.lng, l.lat])
          .addTo(map);
        marker.getElement().classList.add("be-marker-wrap");
        entry = { marker, el };
        store.set(l.id, entry);
        // New pins rise into place, nearest first
        if (!reducedMotion()) {
          el.animate(
            [
              { opacity: 0, transform: "translateY(8px) scale(0.7)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            {
              duration: 420,
              delay: Math.min(arriving++ * 45, 360),
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards",
            },
          );
        }
      }
      entry.el.textContent = formatPesoShort(l.monthlyPrice);
      entry.el.setAttribute(
        "aria-label",
        `${l.title}, ${formatPeso(l.monthlyPrice)} a month`,
      );
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
    // The chosen pin sends out one ring, so your eye finds it on the map
    if (selectedId && selectedId !== lastSelected.current) {
      const el = markers.current.get(selectedId)?.el;
      if (el && lastSelected.current !== null) {
        el.classList.remove("be-ping");
        void el.offsetWidth;
        el.classList.add("be-ping");
      }
    }
    lastSelected.current = selectedId;
    requestAnimationFrame(() => declutter.current());
  }, [selectedId, hoveredId, savedIds, listings, ready]);

  // Keep the selected listing in view
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const l = listings.find((x) => x.id === selectedId);
    if (!l) return;
    const p = map.project([l.lng, l.lat]);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const inside =
      p.x > 40 && p.x < w - rightInset - 40 && p.y > topInset && p.y < h - bottomInset - 20;
    if (!inside) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // Centre the pin in the part of the map the panel leaves uncovered
      map.easeTo({ center: [l.lng, l.lat], offset: [-rightInset / 2, 0], duration: reduce ? 0 : 500 });
    }
  }, [selectedId, ready, listings, topInset, bottomInset, rightInset]);

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
    userMarker.current
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
  }, [ready, userLocation]);

  const zoom = (d: 1 | -1) =>
    d > 0 ? mapRef.current?.zoomIn() : mapRef.current?.zoomOut();

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden bg-[#f2f3f0]",
        className,
      )}
    >
      {/* MapLibre sets position: relative on its container, so size it with h-full rather than inset-0 */}
      <div
        ref={box}
        className="h-full w-full"
        role="region"
        aria-label="Map of listings"
      />

      {!ready && !failed && (
        <div className="be-contours pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-footnote text-subtle shadow-sm">
            Loading map…
          </span>
        </div>
      )}

      {failed && (
        <div className="be-contours absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-xs">
            <p className="text-callout font-semibold">
              The map didn&apos;t load
            </p>
            <p className="mt-1 text-footnote text-subtle">
              Your connection or browser blocked the map tiles. The listings
              still work, and distances are measured from your search.
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
          style={{ top: topInset - 8, marginLeft: -rightInset / 2 }}
        >
          <Search className="size-4" /> Search this area
        </button>
      )}

      {ready && (
        <div
          className="absolute right-4 z-10 flex flex-col gap-2 transition-[translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          // Above MapLibre's credits row on phones; slides left of the listing panel on desktop
          style={{ bottom: bottomInset + 42, translate: `${-rightInset}px 0` }}
        >
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
            <MapButton
              label={locating ? "Finding your location" : "Show my location"}
              onClick={onLocate}
              busy={locating}
            >
              <LocateFixed
                className={cn(
                  "size-[18px]",
                  locating && "animate-pulse text-brand",
                )}
                strokeWidth={1.75}
              />
            </MapButton>
          </div>
        </div>
      )}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
  busy,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
      onClick={onClick}
      className="grid size-11 place-items-center text-ink transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.97] active:bg-surface-2"
    >
      {children}
    </button>
  );
}
