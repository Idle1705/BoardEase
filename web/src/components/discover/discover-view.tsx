"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Building2, CircleCheck, Clock, Megaphone } from "lucide-react";
import { discover, verificationLabel, type DiscoveryFilters, type DiscoveryItem } from "@/lib/discovery";
import { formatPeso } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { cn } from "@/lib/utils";

const DiscoverMap = dynamic(() => import("./discover-map").then((m) => m.DiscoverMap), {
  ssr: false,
  loading: () => <div className="be-contours size-full" aria-busy="true" />,
});

const CENTRE = { lat: 7.06715, lng: 125.59493, label: "University of Mindanao, Matina" };
const TYPES: [string, string][] = [
  ["bedspace", "Bedspace"],
  ["dormitory", "Dormitory"],
  ["boarding-house", "Boarding house"],
  ["private-room", "Private room"],
  ["apartment", "Apartment"],
  ["condominium", "Condominium unit"],
  ["studio", "Studio"],
  ["house", "Whole house"],
];
const label = "flex flex-col gap-1 text-footnote font-medium text-ink";
const control = "h-10 rounded-md bg-white px-2.5 text-body text-ink ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-clay";

export function DiscoverView({ items, generatedAt }: { items: DiscoveryItem[]; generatedAt: string }) {
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const [f, setF] = useState<DiscoveryFilters>({
    centre: CENTRE,
    radiusKm: 3,
    show: { listings: true, external: true, directory: true },
    term: "any",
    furnished: "any",
  });
  const [selected, setSelected] = useState<string | null>(null);
  const out = useMemo(() => discover(items, f), [items, f]);
  const set = (patch: Partial<DiscoveryFilters>) => setF((x) => ({ ...x, ...patch }));
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const counts = {
    listings: out.results.filter((r) => r.kind === "listing").length,
    external: out.results.filter((r) => r.kind === "external").length,
  };

  return (
    <main id="main" className="grid min-h-0 flex-1 lg:grid-cols-12">
      {/* Map left */}
      <section aria-label="Map" className="relative h-[42vh] min-h-[280px] lg:col-span-7 lg:h-auto">
        <DiscoverMap centre={f.centre} radiusKm={f.radiusKm} results={out.results} directory={out.directory} selectedId={selected} onSelect={setSelected} />
      </section>

      {/* Listings right */}
      <section aria-labelledby="discover-title" className="min-h-0 overflow-y-auto border-l border-limestone bg-porcelain lg:col-span-5">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <header>
            <p className="inline-flex items-center gap-1.5 rounded-sm bg-[#fdf3e3] px-2 py-1 text-caption font-semibold text-warn">Prototype on a test database</p>
            <h1 id="discover-title" className="mt-3 font-display text-title1 font-semibold tracking-[-0.02em] text-ink">Rooms near {CENTRE.label}</h1>
            <p className="mt-1.5 text-body text-ink-2">
              BoardEase listings, adverts their owners shared with us, and buildings from the map. Each result says where it came from and what has been confirmed.
            </p>
          </header>

          {/* Sources */}
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-footnote font-semibold text-ink">Show</legend>
            {(
              [
                ["listings", "BoardEase listings", counts.listings],
                ["external", "External adverts", counts.external],
                ["directory", "Property directory", out.directory.length],
              ] as const
            ).map(([k, name, n]) => (
              <label
                key={k}
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-footnote font-medium ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                  f.show[k] ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-ink/15 hover:bg-surface",
                )}
              >
                <input type="checkbox" className="sr-only" checked={f.show[k]} onChange={(e) => set({ show: { ...f.show, [k]: e.target.checked } })} />
                {name}
                <span className="tabular-nums opacity-75">{n}</span>
              </label>
            ))}
          </fieldset>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className={label}>
              Min rent (₱/mo)
              <input className={control} inputMode="numeric" placeholder="Any" onChange={(e) => set({ minPrice: num(e.target.value) })} />
            </label>
            <label className={label}>
              Max rent (₱/mo)
              <input className={control} inputMode="numeric" placeholder="Any" onChange={(e) => set({ maxPrice: num(e.target.value) })} />
            </label>
            <label className={label}>
              Distance
              <select className={control} value={f.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })}>
                {[1, 3, 5, 8].map((k) => (
                  <option key={k} value={k}>
                    Within {k} km
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Type
              <select className={control} onChange={(e) => set({ types: e.target.value ? [e.target.value] : undefined })}>
                <option value="">Any type</option>
                {TYPES.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Bedrooms
              <select className={control} onChange={(e) => set({ minBedrooms: num(e.target.value) })}>
                <option value="">Any</option>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Bedspaces
              <select className={control} onChange={(e) => set({ minBedspaces: num(e.target.value) })}>
                <option value="">Any</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Stay
              <select className={control} value={f.term} onChange={(e) => set({ term: e.target.value as DiscoveryFilters["term"] })}>
                <option value="any">Monthly or short</option>
                <option value="monthly">Monthly</option>
                <option value="short_term">Short-term</option>
              </select>
            </label>
            <label className={label}>
              Furnishing
              <select className={control} value={f.furnished} onChange={(e) => set({ furnished: e.target.value as DiscoveryFilters["furnished"] })}>
                <option value="any">Any</option>
                <option value="furnished">Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </label>
            <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-footnote text-ink-2 sm:col-span-1">
              <input type="checkbox" className="size-4 accent-clay" checked={!!f.includeStale} onChange={(e) => set({ includeStale: e.target.checked })} />
              Include old adverts
            </label>
          </div>

          {/* Results */}
          <div>
            <h2 className="text-callout font-semibold text-ink" aria-live="polite">
              {out.results.length} {out.results.length === 1 ? "place to rent" : "places to rent"} within {f.radiusKm} km
            </h2>
            {out.staleHidden > 0 && !f.includeStale && (
              <p className="mt-1 text-footnote text-subtle">
                {out.staleHidden} older {out.staleHidden === 1 ? "advert is" : "adverts are"} hidden because nobody has checked {out.staleHidden === 1 ? "it" : "them"} in 14 days.
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-3">
              {out.results.map((r) => (
                <ResultCard key={r.id} item={r} now={now} selected={selected === r.id} onSelect={() => setSelected(r.id)} />
              ))}
              {out.results.length === 0 && (
                <li className="rounded-xl bg-white p-5 text-body text-ink-2 ring-1 ring-limestone">
                  Nothing to rent matches these filters yet. Try a wider distance or budget, or look at the buildings below and ask their owners.
                </li>
              )}
            </ul>
          </div>

          {/* Directory: context, never results */}
          {f.show.directory && (
            <details className="group rounded-xl bg-white ring-1 ring-limestone" open={out.results.length === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-callout font-semibold text-ink">
                <span>
                  Buildings in the directory <span className="font-normal text-subtle tabular-nums">({out.directory.length})</span>
                </span>
                <span className="text-footnote font-normal text-subtle">Not listings</span>
              </summary>
              <p className="px-4 pb-2 text-footnote text-ink-2">
                Places people live, from OpenStreetMap. Nothing here is known to be for rent until its owner lists a room.
              </p>
              <ul className="max-h-[420px] divide-y divide-limestone overflow-y-auto">
                {out.directory.slice(0, 60).map((b) => (
                  <li key={b.id} className={cn("flex items-start justify-between gap-3 px-4 py-3", selected === b.id && "bg-clay-soft")}>
                    <button type="button" onClick={() => setSelected(b.id)} className="min-w-0 text-left">
                      <span className="flex items-center gap-1.5 text-body font-medium text-ink">
                        <Building2 className="size-4 shrink-0 text-subtle" /> <span className="truncate">{b.title}</span>
                      </span>
                      <span className="mt-0.5 block text-footnote text-subtle">
                        {b.district}, {formatKm(b.distanceKm)} · {b.source.name}, not yet reviewed
                      </span>
                    </button>
                    <Link href={`/owner/claim/${b.id}`} className="shrink-0 rounded-md px-2.5 py-1.5 text-footnote font-medium text-clay ring-1 ring-clay/30 hover:bg-clay-soft">
                      Claim
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="text-caption text-subtle">
            Building data © OpenStreetMap contributors, available under the Open Database License. External adverts link to the original post; BoardEase does not copy their photos.
          </p>
        </div>
      </section>
    </main>
  );
}

function ResultCard({ item: r, now, selected, onSelect }: { item: DiscoveryItem & { distanceKm: number }; now: Date; selected: boolean; onSelect: () => void }) {
  const v = r.verification;
  const Icon = v.state === "confirmed" ? CircleCheck : v.state === "advertised" ? Megaphone : Clock;
  return (
    <li className={cn("rounded-xl bg-white p-4 ring-1 transition-shadow", selected ? "ring-2 ring-clay" : "ring-limestone hover:shadow-sm")}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-body font-semibold text-ink">{r.title}</span>
          <span className="shrink-0 text-callout font-semibold tabular-nums text-ink">
            {r.priceCents == null ? <span className="text-footnote font-normal text-subtle">Price not given</span> : <>{formatPeso(r.priceCents / 100)}<span className="text-footnote font-normal text-subtle"> / mo</span></>}
          </span>
        </span>
        <span className="mt-1 block text-footnote text-subtle">
          {r.propertyType.replace("-", " ")}, {r.district}, {formatKm(r.distanceKm)}
          {r.bedrooms != null && r.bedrooms > 0 ? `, ${r.bedrooms} bedroom${r.bedrooms > 1 ? "s" : ""}` : ""}
        </span>
      </button>
      <p
        className={cn(
          "mt-3 flex items-center gap-1.5 text-footnote font-medium",
          v.state === "confirmed" ? "text-garden-ink" : v.state === "advertised" ? "text-ink-2" : "text-warn",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {verificationLabel(v, now)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-footnote text-subtle">
        <span>Source: {r.source.attribution}</span>
        {r.url && (
          <a href={r.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 font-medium text-clay underline-offset-2 hover:underline">
            View the original advert <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}
