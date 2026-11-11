"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { useFavorites } from "@/hooks/use-favorites";
import { distanceKm, type LngLat } from "@/lib/geo";
import { formatPeso } from "@/lib/format";
import { DEFAULT_FILTERS, filtersToParams, parseFilters, searchListings, type Filters } from "@/lib/search";
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

export function ExploreView() {
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

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
  }, []);

  const centre = useMemo(() => ({ lat: filters.lat, lng: filters.lng }), [filters.lat, filters.lng]);
  const { results, outsideRadius, overBudget } = useMemo(() => searchListings(DEMO_LISTINGS, filters), [filters]);

  const featured = results.find((r) => r.id === selectedId) ?? results[0] ?? null;
  const activeId = featured?.id ?? null;

  const select = useCallback((id: string) => setSelectedId(id), []);

  // Suggestions for an empty or short result list, from the real data only
  const widen = useMemo(() => {
    const typed = DEMO_LISTINGS.filter((l) => filters.type === "any" || l.type === filters.type);
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
  }, [filters, centre]);

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

  const countLine = `${results.length} demo ${results.length === 1 ? "listing" : "listings"} within ${filters.radiusKm} km`;

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
    <main id="main" className="relative min-h-0 flex-1 lg:grid lg:grid-cols-2">
      <h1 className="sr-only">Rooms for rent near {filters.place}</h1>

      {/* ---------- Map ---------- */}
      <section
        aria-label="Map"
        className={cn("absolute inset-0 lg:relative lg:block", view === "map" ? "block" : "hidden")}
      >
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
        />

        {/* Floating search and filters */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-4 lg:p-5">
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

      {/* ---------- Discovery panel ---------- */}
      <section
        aria-label="Listings"
        className={cn(
          "h-full overflow-y-auto bg-white lg:block lg:border-l lg:border-hairline",
          view === "list" ? "block" : "hidden",
        )}
      >
        <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 pt-4 pb-28 sm:px-6 lg:px-7 lg:pt-5 lg:pb-6">
          {/* Search on phone/tablet list view */}
          <div className="flex gap-2 lg:hidden">
            <LocationSearch
              className="min-w-0 flex-1"
              value={filters.place}
              onPick={({ label, lat, lng }) => setFilters({ place: label, lat, lng })}
            />
            {mobileFilters}
          </div>

          <p className="flex items-start gap-2 rounded-md bg-[#fdf6e7] px-3 py-2 text-footnote text-warn">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold">Demo listings.</span> These rooms are examples that show how BoardEase works. They are not for rent.
            </span>
          </p>

          {featured ? (
            <>
              {/* Desktop: featured listing on top, rail below */}
              <div className="hidden lg:block">
                <FeaturedListing listing={featured} onDetails={() => setDetailsOpen(true)} onContact={() => setContactOpen(true)} />
              </div>

              <div className="flex items-center justify-between gap-3 lg:mt-1">
                <h2 className="text-body font-semibold text-ink sm:text-callout" aria-live="polite">
                  {countLine}
                </h2>
                <SortMenu value={filters.sort} onChange={(sort) => setFilters({ sort })} />
              </div>

              <div className="hidden lg:block">
                <ListingRail results={results} activeId={activeId} onSelect={select} onHover={setHoveredId} />
              </div>

              {/* Phone/tablet list */}
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
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
            />
          )}

          <p className="text-caption text-subtle">
            Photos are licensed stand-ins from Wikimedia Commons and show other places.{" "}
            <Link href="/credits" className="underline underline-offset-2 hover:text-ink">
              Photo credits
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- Map / List switch (phone and tablet) ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center lg:hidden">
        <div role="tablist" aria-label="View" className="pointer-events-auto flex rounded-full bg-ink p-1 shadow-lg">
          {(["list", "map"] as const).map((v) => {
            const Icon = v === "map" ? MapIcon : List;
            const on = view === v;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-5 text-body font-medium transition-colors duration-200",
                  on ? "bg-white text-ink" : "text-white/80 hover:text-white",
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

  const page = (d: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={scroller}
        onScroll={updateEdges}
        className={cn("be-scroll-x flex gap-3 overflow-x-auto", compact ? "scroll-px-4 px-4 pb-2" : "-mx-2 px-2 pt-1 pb-3")}
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
            className={compact ? "w-[220px]" : undefined}
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
        "absolute top-[34%] grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/5 transition-all duration-200 hover:scale-105",
        side === "left" ? "-left-3" : "-right-3",
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
}: {
  filters: Filters;
  nextKm: number | null;
  nextBudget: number | null;
  outsideRadius: number;
  overBudget: number;
  onWiden: (km: number) => void;
  onRaise: (budget: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl bg-surface p-6">
      <h2 className="text-title3 font-semibold">No listings match this search</h2>
      <p className="max-w-[52ch] text-body text-ink-2">
        Nothing within {filters.radiusKm} km of {filters.place} costs {formatPeso(filters.budget)} or less
        {filters.type !== "any" ? " in this room type" : ""}.
        {outsideRadius > 0 && ` ${outsideRadius} more ${outsideRadius === 1 ? "is" : "are"} a little further away.`}
        {overBudget > 0 && ` ${overBudget} nearby ${overBudget === 1 ? "costs" : "cost"} more.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {nextKm && (
          <button type="button" onClick={() => onWiden(nextKm)} className="h-11 rounded-md bg-ink px-4 text-body font-medium text-white hover:bg-ink-2">
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
