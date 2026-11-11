import Image from "next/image";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { formatPeso, formatPesoShort } from "@/lib/format";
import { formatKm, distanceKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { cn } from "@/lib/utils";

/*
 * A still, illustrative preview of the finder for the landing page: a drawn map (not map tiles,
 * so no attribution or API cost) with the real demo listings placed by their coordinates, and
 * the same price-pin styling as the finder. Decorative to screen readers except the card list.
 */

const BOX = { west: 125.577, east: 125.615, south: 7.046, north: 7.085 };
const CENTRE = { lat: 7.0655, lng: 125.5985 }; // University of Mindanao, Matina (the finder's default)
const SELECTED = "demo-matina-private-desk";

const pos = (lat: number, lng: number) => ({
  left: `${((lng - BOX.west) / (BOX.east - BOX.west)) * 100}%`,
  top: `${((BOX.north - lat) / (BOX.north - BOX.south)) * 100}%`,
});

export function NearbyPreview() {
  const shown = DEMO_LISTINGS.filter((l) => l.lng > BOX.west && l.lng < BOX.east && l.lat > BOX.south && l.lat < BOX.north);
  const cards = [SELECTED, "demo-matina-bedspace", "demo-matina-dorm"]
    .map((id) => shown.find((l) => l.id === id))
    .filter((l): l is (typeof shown)[number] => !!l);

  return (
    <div className="grid overflow-hidden rounded-[28px] bg-porcelain ring-1 ring-limestone lg:grid-cols-12">
      {/* Drawn map */}
      <div aria-hidden className="relative aspect-[4/3] overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[480px]">
        <svg viewBox="0 0 700 520" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <rect width="700" height="520" fill="#f1ede5" />
          {/* blocks */}
          <g fill="#ebe5da">
            <rect x="40" y="40" width="150" height="110" rx="6" />
            <rect x="215" y="30" width="120" height="140" rx="6" />
            <rect x="470" y="60" width="180" height="120" rx="6" />
            <rect x="60" y="300" width="140" height="160" rx="6" />
            <rect x="420" y="330" width="200" height="140" rx="6" />
          </g>
          {/* river, in a Garden Green tint */}
          <path d="M-20 140 C 120 170, 210 120, 300 190 S 420 330, 520 300 S 650 380, 730 360" fill="none" stroke="#dbe6df" strokeWidth="26" strokeLinecap="round" />
          {/* roads */}
          <g fill="none" stroke="#ffffff" strokeLinecap="round">
            <path d="M0 250 L700 230" strokeWidth="14" />
            <path d="M330 0 L360 520" strokeWidth="12" />
            <path d="M0 420 C 200 400, 420 470, 700 440" strokeWidth="9" />
            <path d="M120 0 L180 520" strokeWidth="7" />
            <path d="M560 0 L520 520" strokeWidth="7" />
            <path d="M0 90 L700 120" strokeWidth="6" />
          </g>
          {/* distance ring around the search point */}
          <circle cx={(((CENTRE.lng - BOX.west) / (BOX.east - BOX.west)) * 700).toFixed(1)} cy={(((BOX.north - CENTRE.lat) / (BOX.north - BOX.south)) * 520).toFixed(1)} r="190" fill="rgb(32 42 40 / 0.035)" stroke="rgb(32 42 40 / 0.35)" strokeWidth="1.5" strokeDasharray="5 5" />
        </svg>

        {/* search point */}
        <span className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-[0_0_0_6px_rgb(32_42_40/0.14)]" style={pos(CENTRE.lat, CENTRE.lng)} />

        {/* price pins, same look as the finder */}
        {shown.map((l) => {
          const sel = l.id === SELECTED;
          return (
            <span
              key={l.id}
              className={cn(
                "absolute inline-flex h-[30px] -translate-x-1/2 -translate-y-full items-center rounded-full px-[11px] text-[13px] font-[650] whitespace-nowrap tabular-nums",
                sel
                  ? "z-10 scale-110 bg-clay text-white shadow-[0_8px_18px_-6px_rgb(180_70_48/0.55)]"
                  : "bg-white text-ink shadow-[0_2px_8px_-2px_rgb(32_42_40/0.24),0_0_0_1px_rgb(32_42_40/0.08)]",
              )}
              style={pos(l.lat, l.lng)}
            >
              {formatPesoShort(l.monthlyPrice)}
            </span>
          );
        })}
      </div>

      {/* Matching cards */}
      <div className="flex flex-col gap-3 border-t border-limestone bg-white p-5 sm:p-6 lg:col-span-5 lg:border-t-0 lg:border-l">
        <p className="text-footnote font-semibold text-ink">
          {shown.length} demo listings within 3 km of University of Mindanao
        </p>
        <ul className="flex flex-col gap-3" aria-label="Demo listings">
          {cards.map((l) => {
            const sel = l.id === SELECTED;
            return (
              <li
                key={l.id}
                className={cn(
                  "grid grid-cols-[112px_1fr] gap-4 rounded-2xl p-2.5 ring-1",
                  sel ? "bg-white ring-2 ring-clay" : "bg-white ring-limestone",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                  <Image src={`${l.photos[0].src}.webp`} alt={l.photos[0].alt} fill sizes="112px" loading="lazy" className="object-cover" />
                </div>
                <div className="min-w-0 py-1">
                  <p className="text-callout font-semibold tabular-nums text-ink">
                    {formatPeso(l.monthlyPrice)} <span className="text-footnote font-normal text-subtle">/ month</span>
                  </p>
                  <p className="truncate text-body text-ink">{l.title}</p>
                  <p className="mt-0.5 text-footnote text-subtle">
                    {PROPERTY_TYPE_LABEL[l.type]}, {formatKm(distanceKm(CENTRE, l))}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
