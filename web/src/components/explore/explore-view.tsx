"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useFavorites } from "@/hooks/use-favorites";
import { distanceKm, type LngLat } from "@/lib/geo";
import { formatPeso } from "@/lib/format";
import type { PublicListing } from "@/lib/listing-types";
import { DEFAULT_FILTERS, filtersToParams, parseFilters, searchListings, type Filters } from "@/lib/search";
import { EASE_MOVE, EASE_OUT, Flip, gsap, reducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { FeaturedListing } from "./featured-listing";
import {
  BudgetControl,
  FilterChips,
  LocationSearch,
  RadiusControl,
  SortChoices,
  SortMenu,
  TypeChoices,
} from "./filters";
import { ListingCard } from "./listing-card";
import { ContactDialog, ListingDetailsDialog } from "./listing-dialogs";
import { MapView } from "./map-view";

/**
 * The finder. `listings` are real published listings from Neon (server/marketplace/core.ts), plus demo
 * listings only when the server enables them (BOARDEASE_DEMO_LISTINGS=1), always badged as demos.
 */
export function ExploreView({ listings }: { listings: PublicListing[] }) {
  const params = useSearchParams();
  const [filters, setFiltersState] = useState<Filters>(() => parseFilters(new URLSearchParams(params.toString())));
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get("id"));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">(() => (params.get("view") === "map" ? "map" : "list"));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const [locating, setLocating] = useState(false);
  const { saved } = useFavorites();
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);

  // Phone/tablet Map <-> List: the new view is revealed by a circle growing from the tapped tab
  // (motion #17 masks + #11 enter from the trigger). The old view stays visible underneath until it ends.
  const [leaving, setLeaving] = useState<"map" | "list" | null>(null);
  const mapSection = useRef<HTMLElement>(null);
  const listSection = useRef<HTMLElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const switchView = (v: "map" | "list") => {
    if (v === view) return;
    if (!isDesktop && !reducedMotion()) setLeaving(view);
    setView(v);
  };
  useLayoutEffect(() => {
    if (!leaving) return;
    const el = view === "map" ? mapSection.current : listSection.current;
    const tab = tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !tab) {
      setLeaving(null);
      return;
    }
    const b = el.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const x = t.left + t.width / 2 - b.left;
    const y = t.top + t.height / 2 - b.top;
    const r = Math.hypot(Math.max(x, b.width - x), Math.max(y, b.height - y));
    const tween = gsap.fromTo(
      el,
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      {
        clipPath: `circle(${r}px at ${x}px ${y}px)`,
        duration: 0.5,
        ease: EASE_OUT,
        clearProps: "clipPath",
        onComplete: () => setLeaving(null),
      },
    );
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: "clipPath" });
    };
  }, [view, leaving]);

  // Keep the URL in step with the search so it can be shared or reloaded
  useEffect(() => {
    const p = filtersToParams(filters, selectedId);
    if (view === "map") p.set("view", "map");
    const qs = p.toString();
    const next = qs ? `?${qs}` : window.location.pathname;
    if (next !== window.location.search && !(qs === "" && window.location.search === "")) {
      window.history.replaceState(null, "", next);
    }
  }, [filters, selectedId, view]);

  // Before a filter change, remember where every visible card sits so Flip can show what moved
  const flipState = useRef<Flip.FlipState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const captureFlip = useCallback(() => {
    const cards = [...(panelRef.current?.querySelectorAll<HTMLElement>("[data-flip-id]") ?? [])].filter((el) => el.offsetParent);
    flipState.current = cards.length && !reducedMotion() ? Flip.getState(cards) : null;
  }, []);
  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      captureFlip();
      setFiltersState((f) => ({ ...f, ...patch }));
    },
    [captureFlip],
  );

  const centre = useMemo(() => ({ lat: filters.lat, lng: filters.lng }), [filters.lat, filters.lng]);
  const hasDemo = listings.some((l) => l.demo);
  const { results, outsideRadius, overBudget } = useMemo(() => searchListings(listings, filters), [listings, filters]);

  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !panelRef.current) return;
    const targets = [...panelRef.current.querySelectorAll<HTMLElement>("[data-flip-id]")].filter((el) => el.offsetParent);
    const tl = Flip.from(state, {
      targets,
      duration: 0.45,
      ease: EASE_MOVE,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: EASE_OUT, stagger: 0.03 }),
    });
    return () => {
      tl.progress(1).kill();
    };
  }, [results]);

  // Nothing is picked until someone presses a price on the map (or "Show list");
  // on desktop that opens the floating listing panel over the map
  const featured = results.find((r) => r.id === selectedId) ?? null;
  const activeId = featured?.id ?? null;
  const [entered, setEntered] = useState(false);
  const select = useCallback((id: string) => {
    setEntered(true);
    setSelectedId(id);
  }, []);

  const panelBox = useRef<HTMLElement>(null);
  const showListButton = useRef<HTMLButtonElement>(null);
  const panelOpen = isDesktop && !!featured;
  const [panelW, setPanelW] = useState(0);

  // The panel's width tells the map how much of it is covered
  useLayoutEffect(() => {
    const el = panelBox.current;
    if (!panelOpen || !el) {
      setPanelW(0);
      return;
    }
    const ro = new ResizeObserver(() => setPanelW(el.offsetWidth));
    ro.observe(el);
    setPanelW(el.offsetWidth);
    return () => ro.disconnect();
  }, [panelOpen]);

  // Panel entrance: slides 24px in from the right edge and fades (fade only for reduced motion)
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    const el = panelBox.current;
    if (panelOpen && !wasOpen.current && entered && el) {
      const reduce = reducedMotion();
      gsap.fromTo(
        el,
        { opacity: 0, x: reduce ? 0 : 24 },
        { opacity: 1, x: 0, duration: reduce ? 0.15 : 0.32, ease: EASE_OUT, clearProps: "transform,opacity" },
      );
    }
    wasOpen.current = panelOpen;
  }, [panelOpen, entered]);

  const closePanel = useCallback(
    (returnFocus: boolean) => {
      const id = selectedId;
      const finish = () => {
        setSelectedId(null);
        // Focus goes back to the pin that opened the panel, or to "Show list"
        if (returnFocus)
          requestAnimationFrame(() => {
            const pin = id ? document.querySelector<HTMLElement>(`.maplibregl-map [data-listing-id="${id}"]`) : null;
            (pin ?? showListButton.current)?.focus();
          });
      };
      const box = panelBox.current;
      if (!box || reducedMotion()) return finish();
      // Leaves the way it came in, a little faster
      gsap.to(box, { opacity: 0, x: 16, duration: 0.18, ease: EASE_OUT, onComplete: finish });
    },
    [selectedId],
  );

  // Esc closes the panel, unless a dialog, menu or text field is using the key
  useEffect(() => {
    if (!panelOpen || detailsOpen || contactOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("input, textarea, select, [role=menu], [role=listbox], [role=dialog]")) return;
      closePanel(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, detailsOpen, contactOpen, closePanel]);

  // Suggestions for an empty or short result list, from the real data only
  const widen = useMemo(() => {
    const typed = listings.filter((l) => filters.type === "any" || l.type === filters.type);
    const inBudget = typed
      .filter((l) => l.monthlyPrice <= filters.budget)
      .map((l) => distanceKm(centre, l))
      .filter((d) => d > filters.radiusKm)
      .sort((a, b) => a - b);
    const nextKm = inBudget.length ? Math.min(10, Math.ceil(inBudget[0] * 2) / 2) : null;
    const pricier = typed
      .filter((l) => l.monthlyPrice > filters.budget && distanceKm(centre, l) <= filters.radiusKm)
      .map((l) => l.monthlyPrice)
      .sort((a, b) => a - b);
    const nextBudget = pricier.length ? Math.min(20000, Math.ceil(pricier[0] / 500) * 500) : null;
    return { nextKm: nextKm && nextKm > filters.radiusKm ? nextKm : null, nextBudget };
  }, [listings, filters, centre]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share your location. Search for a place instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(here);
        setFilters({ ...here, place: "Your location" });
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings, or search for a place."
            : "Couldn't find your location. Search for a place instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const filtersChanged =
    (filters.budget !== DEFAULT_FILTERS.budget ? 1 : 0) +
    (filters.radiusKm !== DEFAULT_FILTERS.radiusKm ? 1 : 0) +
    (filters.type !== DEFAULT_FILTERS.type ? 1 : 0) +
    (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0);


  const mobileFilters = (
    <Sheet>
      <SheetTrigger className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-footnote font-semibold text-ink shadow-md ring-1 ring-black/5">
        <SlidersHorizontal className="size-4" />
        Filters
        {filtersChanged > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-brand text-caption text-white">{filtersChanged}</span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-xl p-0">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-2" aria-hidden />
        <div className="px-5 pt-3 pb-2">
          <SheetTitle className="text-title3 font-semibold">Filters</SheetTitle>
          <SheetDescription className="text-footnote text-subtle">Changes apply as you make them.</SheetDescription>
        </div>
        <div className="flex flex-col gap-7 px-5 py-4">
          <section aria-labelledby="f-budget">
            <h3 id="f-budget" className="mb-3 text-callout font-semibold">Budget</h3>
            <BudgetControl value={filters.budget} onCommit={(budget) => setFilters({ budget })} />
          </section>
          <section aria-labelledby="f-radius">
            <h3 id="f-radius" className="mb-3 text-callout font-semibold">Distance</h3>
            <RadiusControl value={filters.radiusKm} onCommit={(radiusKm) => setFilters({ radiusKm })} />
          </section>
          <section aria-labelledby="f-type">
            <h3 id="f-type" className="mb-3 text-callout font-semibold">Room type</h3>
            <TypeChoices value={filters.type} onChange={(type) => setFilters({ type })} />
          </section>
          <section aria-labelledby="f-sort">
            <h3 id="f-sort" className="mb-3 text-callout font-semibold">Sort by</h3>
            <SortChoices value={filters.sort} onChange={(sort) => setFilters({ sort })} />
          </section>
        </div>
        <div className="sticky bottom-0 flex gap-3 border-t border-hairline bg-white px-5 py-3">
          <button
            type="button"
            onClick={() => setFilters({ budget: DEFAULT_FILTERS.budget, radiusKm: DEFAULT_FILTERS.radiusKm, type: "any", sort: "distance" })}
            className="h-12 rounded-md px-4 text-body font-medium text-ink hover:bg-surface"
          >
            Reset
          </button>
          <CloseSheetButton label={results.length ? `Show ${results.length} ${results.length === 1 ? "listing" : "listings"}` : "Show results"} />
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <main id="main" className="relative min-h-0 flex-1">
      <h1 className="sr-only">Rooms for rent near {filters.place}</h1>

      {/* ---------- Map ---------- */}
      <section
        ref={mapSection}
        aria-label="Map and search"
        className={cn(
          "absolute inset-0 lg:block",
          view === "map" || leaving === "map" ? "block" : "hidden",
          leaving && (view === "map" ? "z-20" : "z-0"),
        )}
      >
        {/* Floating search and filters: first in the DOM so Tab reaches search before the map pins */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-4 lg:p-5 lg:pt-[92px]">
          <div className="pointer-events-auto flex gap-2">
            <LocationSearch
              className="min-w-0 flex-1 lg:max-w-[440px]"
              value={filters.place}
              onPick={({ label, lat, lng }) => setFilters({ place: label, lat, lng })}
            />
            <div className="lg:hidden">{mobileFilters}</div>
          </div>
          <div className="pointer-events-auto hidden lg:block">
            <FilterChips filters={filters} set={setFilters} />
          </div>
        </div>

        <MapView
          centre={centre}
          radiusKm={filters.radiusKm}
          listings={results}
          selectedId={activeId}
          hoveredId={hoveredId}
          savedIds={saved}
          userLocation={userLocation}
          onSelect={select}
          onHover={setHoveredId}
          onSearchArea={(c) => setFilters({ ...c, place: "Selected area" })}
          onLocate={locate}
          locating={locating}
          topInset={isDesktop ? 130 : 84}
          bottomInset={!isDesktop && view === "map" ? 330 : 8}
          rightInset={panelOpen && panelW ? panelW + 20 : 0}
        />

        {/* Phone and tablet map: a rail of results above the switch */}
        {view === "map" && (
          <div className="absolute inset-x-0 bottom-20 z-20 lg:hidden">
            {results.length ? (
              <ListingRail
                results={results}
                activeId={activeId}
                onSelect={(id) => {
                  if (id === activeId) setDetailsOpen(true);
                  select(id);
                }}
                onHover={setHoveredId}
                compact
              />
            ) : (
              <div className="mx-4 rounded-lg bg-white p-4 text-body shadow-md">
                No listings match here. Widen the distance or raise the budget in Filters.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------- Desktop: floating listing panel over the map ---------- */}
      {isDesktop && results.length > 0 && !featured && (
        <div className="absolute top-[92px] right-5 z-30 hidden w-[268px] rounded-[22px] bg-white p-4 shadow-lg ring-1 ring-black/5 lg:block">
          <p className="text-callout font-semibold text-ink" aria-live="polite">
            <AnimatedCount value={results.length} /> {countNoun(results)} within {filters.radiusKm} km
          </p>
          <p className="mt-1 text-footnote text-subtle">
            Press a price on the map to see the place.{hasDemo && <> Includes demo listings, not for rent (<Link href="/credits" className="underline hover:text-ink">credits</Link>).</>}
          </p>
          <button
            ref={showListButton}
            type="button"
            onClick={() => select(results[0].id)}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-clay text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
          >
            <List className="size-4" />
            Show list
          </button>
        </div>
      )}

      {isDesktop && results.length === 0 && (
        <aside aria-label="No results" className="absolute top-[92px] right-5 z-30 hidden w-[400px] rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-black/5 lg:block">
          <EmptyState
            inPanel
            filters={filters}
            nextKm={widen.nextKm}
            nextBudget={widen.nextBudget}
            outsideRadius={outsideRadius}
            overBudget={overBudget}
            onWiden={(radiusKm) => setFilters({ radiusKm })}
            onRaise={(budget) => setFilters({ budget })}
            onReset={() => setFilters({ ...DEFAULT_FILTERS })}
            total={listings.length}
          />
        </aside>
      )}

      {panelOpen && featured && (
        <aside
          ref={panelBox}
          aria-label={`Listing: ${featured.title}`}
          className="absolute top-[92px] right-5 z-30 hidden max-h-[calc(100%-112px)] w-[min(640px,calc(50vw-24px))] flex-col gap-4 lg:flex overflow-y-auto overscroll-contain rounded-[28px] bg-white p-3 shadow-xl ring-1 ring-black/5"
        >
          <button
            type="button"
            aria-label="Close listing panel"
            onClick={() => closePanel(true)}
            className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-surface text-ink transition-[background-color,scale] duration-150 hover:bg-surface-2 active:scale-[0.97]"
          >
            <X className="size-5" strokeWidth={1.9} />
          </button>

          <FeaturedListing
            listing={featured}
            enter={entered}
            onClose={() => closePanel(true)}
            onDetails={() => setDetailsOpen(true)}
            onContact={() => setContactOpen(true)}
          />

          <div className="flex items-center justify-between gap-3 border-t border-hairline px-1 pt-3">
            <h2 className="text-body font-semibold text-ink" aria-live="polite">
              <AnimatedCount value={results.length} /> {countNoun(results)} within {filters.radiusKm} km
            </h2>
            <SortMenu value={filters.sort} onChange={(sort) => setFilters({ sort })} />
          </div>

          <ListingRail results={results} activeId={activeId} onSelect={select} onHover={setHoveredId} />

          {hasDemo && (
            <p className="flex items-start gap-1.5 px-1 pb-1 text-caption text-warn">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>
                Demo listings are examples of how BoardEase works, not for rent. Photos are stand-ins (<Link href="/credits" className="underline hover:text-ink">credits</Link>).
              </span>
            </p>
          )}
        </aside>
      )}

      {/* ---------- Phone and tablet list ---------- */}
      <section
        ref={listSection}
        aria-label="Results"
        className={cn(
          "h-full overflow-y-auto bg-white lg:hidden",
          view === "list" || leaving === "list" ? "block" : "hidden",
          leaving && (view === "list" ? "relative z-20" : "z-0"),
        )}
      >
        <div ref={panelRef} className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 pt-4 pb-28 sm:px-6">
          {/* Search on phone/tablet list view */}
          <div className="flex gap-2">
            <LocationSearch
              className="min-w-0 flex-1"
              value={filters.place}
              onPick={({ label, lat, lng }) => setFilters({ place: label, lat, lng })}
            />
            {mobileFilters}
          </div>

          {hasDemo && (
            <p className="flex items-start gap-2 rounded-md bg-[#fdf6e7] px-3 py-2 text-footnote text-warn">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-semibold">Demo listings</span> are examples that show how BoardEase works; not for rent. Photos are stand-ins of other places (<Link href="/credits" className="underline hover:text-ink">credits</Link>).
              </span>
            </p>
          )}

          {results.length ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-body font-semibold text-ink sm:text-callout" aria-live="polite">
                  <AnimatedCount value={results.length} /> {countNoun(results)} within {filters.radiusKm} km
                </h2>
                <SortMenu value={filters.sort} onChange={(sort) => setFilters({ sort })} />
              </div>

              {/* Phone/tablet list */}
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Listings">
                {results.map((r) => (
                  <ListingCard
                    key={r.id}
                    listing={r}
                    layout="grid"
                    selected={false}
                    onSelect={() => {
                      select(r.id);
                      setDetailsOpen(true);
                    }}
                    onHover={() => {}}
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              filters={filters}
              nextKm={widen.nextKm}
              nextBudget={widen.nextBudget}
              outsideRadius={outsideRadius}
              overBudget={overBudget}
              onWiden={(radiusKm) => setFilters({ radiusKm })}
              onRaise={(budget) => setFilters({ budget })}
              onReset={() => setFilters({ ...DEFAULT_FILTERS })}
              total={listings.length}
            />
          )}

        </div>
      </section>

      {/* ---------- Map / List switch (phone and tablet) ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center lg:hidden">
        <div ref={tabs} role="tablist" aria-label="View" className="pointer-events-auto relative grid grid-cols-2 rounded-full bg-ink p-1 shadow-lg">
          {/* One white pill slides between the two tabs, so the switch reads as a single control */}
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: view === "map" ? "translateX(100%)" : "translateX(0)" }}
          />
          {(["list", "map"] as const).map((v) => {
            const Icon = v === "map" ? MapIcon : List;
            const on = view === v;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => switchView(v)}
                className={cn(
                  "relative z-10 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-body font-medium transition-colors duration-300",
                  on ? "text-ink" : "text-white/80 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                {v === "map" ? "Map" : "List"}
              </button>
            );
          })}
        </div>
      </div>

      <ListingDetailsDialog
        listing={featured}
        open={detailsOpen && !!featured}
        onOpenChange={setDetailsOpen}
        onContact={() => {
          setDetailsOpen(false);
          setContactOpen(true);
        }}
      />
      <ContactDialog listing={featured} open={contactOpen && !!featured} onOpenChange={setContactOpen} />
    </main>
  );
}

function CloseSheetButton({ label }: { label: string }) {
  return (
    <SheetClose className="h-12 flex-1 rounded-md bg-ink text-body font-medium text-white hover:bg-ink-2">{label}</SheetClose>
  );
}

function ListingRail({
  results,
  activeId,
  onSelect,
  onHover,
  compact,
}: {
  results: ReturnType<typeof searchListings>["results"];
  activeId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  compact?: boolean;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdges();
  }, [results, updateEdges]);

  const page = (d: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  // Bring the selected card into view when it was picked on the map
  useEffect(() => {
    const el = activeId ? items.current.get(activeId) : null;
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      box.scrollTo({ left: Math.max(0, left - 16), behavior: reduce ? "auto" : "smooth" });
    }
  }, [activeId]);

  return (
    <div className="relative">
      <ul
        ref={scroller}
        onScroll={compact ? undefined : updateEdges}
        className={cn("be-scroll-x flex gap-3 overflow-x-auto", compact ? "scroll-px-4 px-4 pb-2" : "px-1 pt-1 pb-2")}
        aria-label="Listings"
      >
        {results.map((r) => (
          <ListingCard
            key={r.id}
            ref={(node) => {
              if (node) items.current.set(r.id, node);
              else items.current.delete(r.id);
            }}
            listing={r}
            selected={r.id === activeId}
            onSelect={() => onSelect(r.id)}
            onHover={(on) => onHover(on ? r.id : null)}
            className={compact ? "w-[220px]" : "w-[196px]"}
          />
        ))}
      </ul>
      {!compact && (
        <>
          <RailButton side="left" hidden={edges.start} onClick={() => page(-1)} />
          <RailButton side="right" hidden={edges.end} onClick={() => page(1)} />
        </>
      )}
    </div>
  );
}

function RailButton({ side, hidden, onClick }: { side: "left" | "right"; hidden: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Scroll listings left" : "Scroll listings right"}
      onClick={onClick}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      className={cn(
        "absolute top-[30%] grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/5 transition-[opacity,scale] duration-200 hover:scale-105 active:scale-[0.97]",
        side === "left" ? "left-1" : "right-1",
        hidden && "pointer-events-none scale-90 opacity-0",
      )}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </button>
  );
}

function EmptyState({
  filters,
  nextKm,
  nextBudget,
  outsideRadius,
  overBudget,
  onWiden,
  onRaise,
  onReset,
  inPanel = false,
  total,
}: {
  inPanel?: boolean;
  /** Listings in the whole finder; 0 means nobody has published yet. */
  total: number;
  filters: Filters;
  nextKm: number | null;
  nextBudget: number | null;
  outsideRadius: number;
  overBudget: number;
  onWiden: (km: number) => void;
  onRaise: (budget: number) => void;
  onReset: () => void;
}) {
  if (total === 0)
    return (
      <div className={cn("flex flex-col items-start gap-3", inPanel ? "" : "be-contours rounded-xl p-6")}>
        <h2 className="font-display text-title2 font-semibold tracking-[-0.015em]">No rooms listed yet</h2>
        <p className="max-w-[52ch] text-body text-ink-2">
          BoardEase is just starting in Davao City. Owners are adding their places now, and each listing appears here once it has been reviewed. We don&apos;t fill the map with made-up rooms.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/owners" className="inline-flex h-11 items-center rounded-md bg-clay px-4 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
            List your property
          </Link>
          <Link href="/how-it-works" className="inline-flex h-11 items-center rounded-md px-4 text-body font-medium text-ink-2 hover:bg-surface-2">
            How BoardEase works
          </Link>
        </div>
      </div>
    );
  return (
    // Phone list: a textured card of its own. Desktop panel: sits directly in the panel (no card in a card)
    <div className={cn("flex flex-col items-start gap-3", inPanel ? "" : "be-contours rounded-xl p-6")}>
      <h2 className="font-display text-title2 font-semibold tracking-[-0.015em]">No listings match this search</h2>
      <p className="max-w-[52ch] text-body text-ink-2">
        Nothing within {filters.radiusKm} km of {filters.place} costs {formatPeso(filters.budget)} or less
        {filters.type !== "any" ? " in this room type" : ""}.
        {outsideRadius > 0 && ` ${outsideRadius} more ${outsideRadius === 1 ? "is" : "are"} a little further away.`}
        {overBudget > 0 && ` ${overBudget} nearby ${overBudget === 1 ? "costs" : "cost"} more.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {nextKm && (
          <button type="button" onClick={() => onWiden(nextKm)} className="h-11 rounded-md bg-clay px-4 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
            Widen to {nextKm} km
          </button>
        )}
        {nextBudget && (
          <button type="button" onClick={() => onRaise(nextBudget)} className="h-11 rounded-md bg-white px-4 text-body font-medium ring-1 ring-black/12 hover:bg-surface-2">
            Raise budget to {formatPeso(nextBudget)}
          </button>
        )}
        <button type="button" onClick={onReset} className="h-11 rounded-md px-4 text-body font-medium text-ink-2 hover:bg-surface-2">
          Reset the search
        </button>
      </div>
    </div>
  );
}

/** "listings", "demo listings" or, when real and demo mix, plain "listings". */
function countNoun(results: { demo: boolean }[]) {
  const n = results.length === 1 ? "listing" : "listings";
  return results.length && results.every((r) => r.demo) ? `demo ${n}` : n;
}

/** The result count rolls to its new value, so a filter change visibly lands. */
function AnimatedCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.textContent = String(value);
      shown.current = value;
      return;
    }
    const o = { n: shown.current };
    const t = gsap.to(o, {
      n: value,
      duration: 0.5,
      ease: EASE_OUT,
      onUpdate: () => {
        el.textContent = String(Math.round(o.n));
      },
      onComplete: () => {
        shown.current = value;
      },
    });
    return () => {
      t.kill();
      shown.current = value;
    };
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
