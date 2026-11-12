import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import { RevealRoot } from "@/components/landing/reveal";
import { ScrollScenes } from "@/components/landing/scroll-scenes";
import { BTN_PRIMARY, FinalCta, NOT_A_LISTING, WRAP } from "@/components/landing/landing-page";
import apartmentBlock from "../../../public/editorial/owner-street.jpg";
import deskRoom from "../../../public/editorial/hero-room.jpg";

/*
 * List Your Property (docs/web/DESIGN_SYSTEM.md, "List Your Property page", 2026-11-12).
 * Same direction as the landing: split hero with an edge-to-edge photo, one product visual, an honest
 * status list, Deep Ink closing. The rooms table is example data and says so.
 */

export const metadata = { title: "List your property" };

const STEPS = [
  ["Add your property", "The building once. Its exact address stays private."],
  ["Add rooms and beds", "Single, shared or per bed, each with its own rent."],
  ["See what is free", "Free beds come from who actually lives there."],
];

const ROOMS: [string, string, number, number, string][] = [
  ["Room 1", "Single", 1, 0, "₱4,500"],
  ["Room 2", "Shared, per bed", 4, 1, "₱2,200"],
  ["Room 3", "Shared, per bed", 2, 2, "₱2,600"],
  ["Room 4", "Single", 1, 1, "₱3,800"],
];

const NOW = ["Owner account", "Properties, rooms and beds", "Free beds per room", "Listings with your photos", "Renter inquiries"];
const NEXT = ["Tenant records", "Rent and utility billing", "Email or SMS alerts"];

export default function Owners() {
  return (
    <RevealRoot className="flex-1 overflow-y-auto overflow-x-clip bg-porcelain">
      <Hero />
      <Beds />
      <Status />
      <FinalCta
        title="Your rooms, ready for renters."
        primary={{ href: "/sign-up?role=owner", label: "Create an owner account" }}
        secondary={{ href: "/owner/dashboard", label: "Go to the owner portal" }}
        photo={deskRoom}
        alt="A small bedroom with a desk under the window and a white chair"
      />
      <SiteFooter compact />
      <ScrollScenes />
    </RevealRoot>
  );
}

/* ---------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section aria-labelledby="owners-title" data-bar="paper" className="be-canvas relative isolate pb-20 lg:pb-28">
      <div aria-hidden className="be-columns pointer-events-none absolute inset-y-0 right-1/2 left-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] -z-10 hidden border-r border-ink/[0.045] lg:block" />
      <div className="grid gap-y-10 lg:grid-cols-2 lg:items-end">
        <div className="px-5 pt-10 sm:px-8 sm:pt-14 lg:pt-0 lg:pr-14 lg:pb-14 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
          <h1
            id="owners-title"
            className="be-enter font-display text-[clamp(3rem,1rem+4.9vw,5.25rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance text-ink"
            style={{ ["--rise" as string]: "22px" }}
          >
            Fill your rooms. Keep track of every bed.
          </h1>
          <p className="be-enter mt-7 text-lead text-ink-2" style={{ ["--d" as string]: "110ms" }}>
            For boarding houses, dorms and bedspaces in Davao City.
          </p>
          <div className="be-enter mt-10 flex flex-wrap gap-3" style={{ ["--d" as string]: "190ms", ["--rise" as string]: "8px" }}>
            <Link href="/sign-up?role=owner" className={BTN_PRIMARY}>
              Create an owner account
              <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
            <Link
              href="/owner/dashboard"
              className="inline-flex h-13 items-center rounded-md px-6 text-[17px] font-semibold text-ink ring-1 ring-ink/20 transition-[background-color,scale] duration-150 hover:bg-white active:scale-[0.97]"
            >
              Go to the owner portal
            </Link>
          </div>
        </div>

        <figure className="px-5 sm:px-8 lg:px-0">
          <div
            data-scene="hero-photo"
            className="be-unveil relative aspect-[4/5] overflow-hidden bg-limestone sm:aspect-[5/4] lg:aspect-auto lg:h-[min(calc(100dvh-120px),860px)]"
            style={{ ["--d" as string]: "100ms" }}
          >
            <Image
              src={apartmentBlock}
              alt="A mid-rise apartment block with trees along a paved walkway"
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-[35%_50%]"
            />
          </div>
          <figcaption className="mt-3 text-caption text-subtle lg:pr-10">{NOT_A_LISTING}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Beds: the product, in one picture */

function Beds() {
  const beds = ROOMS.reduce((n, r) => n + r[2], 0);
  const free = ROOMS.reduce((n, r) => n + r[3], 0);
  return (
    <section aria-labelledby="beds-title" data-bar="stone" className="be-stone py-24 sm:py-32">
      <div className={cn(WRAP, "grid gap-x-16 gap-y-14 lg:grid-cols-12 lg:items-center")}>
        <div className="lg:col-span-5">
          <h2
            id="beds-title"
            data-reveal
            className="font-display text-[clamp(2.25rem,1.2rem+2.8vw,3.75rem)] leading-[1] font-semibold tracking-[-0.035em] text-balance text-ink"
          >
            Built around beds, not just rooms.
          </h2>
          <ol className="mt-12 border-t border-ink/15">
            {STEPS.map(([head, body], i) => (
              <li
                key={head}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
                className="grid grid-cols-[3rem_1fr] gap-x-3 border-b border-ink/15 py-5"
              >
                <span aria-hidden className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em] text-clay tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-callout font-semibold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {head}
                  </p>
                  <p className="mt-1 text-body text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* The owner's view, drawn at full size: rooms, beds, free beds. Example data, labelled. */}
        <figure className="lg:col-span-7" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
          <div className="bg-white p-6 shadow-[0_40px_80px_-48px_rgb(32_42_40/0.45)] ring-1 ring-ink/8 sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-title2 font-semibold tracking-[-0.02em] text-ink">Rooms</p>
              <p className="text-footnote text-subtle">Example data</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-px bg-limestone sm:grid-cols-3">
              {[
                ["Beds", beds],
                ["Free now", free],
                ["Rooms", ROOMS.length],
              ].map(([k, v], i) => (
                <div key={k} className={cn("bg-white py-4 pr-4", i === 2 && "hidden sm:block", i > 0 && "pl-4")}>
                  <p className="text-footnote text-subtle">{k}</p>
                  <p className={cn("mt-1 font-display text-[32px] leading-none font-semibold tabular-nums", k === "Free now" ? "text-garden" : "text-ink")}>{v}</p>
                </div>
              ))}
            </div>
            <table className="mt-6 w-full text-left text-body">
              <caption className="sr-only">Example room inventory in the owner portal</caption>
              <thead className="text-footnote text-subtle">
                <tr className="border-b border-limestone">
                  <th scope="col" className="pb-3 font-medium">Room</th>
                  <th scope="col" className="hidden pb-3 font-medium sm:table-cell">Type</th>
                  <th scope="col" className="pb-3 text-right font-medium">Beds</th>
                  <th scope="col" className="pb-3 text-right font-medium">Free</th>
                  <th scope="col" className="pb-3 text-right font-medium">Rent</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-ink">
                {ROOMS.map(([room, type, total, open, rent]) => (
                  <tr key={room} className="border-b border-limestone/70 last:border-0">
                    <td className="py-3.5 font-medium">{room}</td>
                    <td className="hidden py-3.5 text-ink-2 sm:table-cell">{type}</td>
                    <td className="py-3.5 text-right">{total}</td>
                    <td className="py-3.5 text-right">
                      <span className={cn("inline-flex min-w-7 justify-center rounded-sm px-1.5 font-semibold", open > 0 ? "bg-garden-soft text-garden-ink" : "text-subtle")}>{open}</span>
                    </td>
                    <td className="py-3.5 text-right text-ink-2">{rent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="mt-3 text-caption text-subtle">How the owner portal counts beds. Example data, not a real property.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Status: honest, short */

function Status() {
  return (
    <section aria-labelledby="status-title" data-bar="white" className="bg-white py-24 sm:py-28">
      <div className={cn(WRAP, "grid gap-x-16 gap-y-12 lg:grid-cols-12")}>
        <div className="lg:col-span-5" data-reveal>
          <h2 id="status-title" className="font-display text-[clamp(2rem,1.2rem+2vw,3rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-ink">
            What works today.
          </h2>
          <p className="mt-5 max-w-[36ch] text-body text-ink-2">
            Tenant names, numbers and bills are visible to you alone. Renters only see the rent, the room and the area.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7">
          <StatusList title="Working today" items={NOW} live />
          <StatusList title="In development" items={NEXT} />
        </div>
      </div>
    </section>
  );
}

function StatusList({ title, items, live }: { title: string; items: string[]; live?: boolean }) {
  return (
    <div data-reveal>
      <h3 className="flex items-center gap-2 text-footnote font-semibold text-ink">
        <span aria-hidden className={live ? "size-2 rounded-full bg-garden" : "size-2 rounded-full bg-limestone ring-1 ring-ink/20"} />
        {title}
      </h3>
      <ul className="mt-4 border-t border-ink/15">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-3 border-b border-ink/10 py-4 text-callout text-ink">
            {live ? <Check aria-hidden className="size-4 text-garden" strokeWidth={2.4} /> : <span aria-hidden className="size-4 rounded-full border border-dashed border-ink/30" />}
            <span className={live ? undefined : "text-ink-2"}>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
