import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { formatPeso } from "@/lib/format";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import { RevealRoot } from "./reveal";
import { NearbyPreview } from "./nearby-preview";
import heroRoom from "../../../public/editorial/hero-room.jpg";
import heroBuilding from "../../../public/editorial/hero-building.jpg";
import renterRoom from "../../../public/editorial/renter-room.jpg";
import ownerStreet from "../../../public/editorial/owner-street.jpg";
import ctaCorridor from "../../../public/editorial/cta-corridor.jpg";

/*
 * Landing page. Art direction and the reasons for each section: docs/web/DESIGN_SYSTEM.md, "Landing page".
 * Editorial photos are Unsplash (public/editorial/MANIFEST.md) and never stand for a listing.
 */

const WRAP = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10";

export function LandingPage() {
  return (
    <RevealRoot className="flex-1 overflow-y-auto overflow-x-clip bg-porcelain">
      {/* One continuous daylight field behind the hero and the intro, so the light never ends at a seam */}
      <div className="be-daylight">
        <Hero />
        <WhatIs />
      </div>
      <TwoWays />
      <NearbySection />
      <HowItWorks />
      <WhyBoardEase />
      <FinalCta />
      <SiteFooter />
    </RevealRoot>
  );
}

/* ---------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Drafting lines: architectural, very faint, only behind the photographs */}
      <div aria-hidden className="be-drafting pointer-events-none absolute inset-y-0 right-0 -z-10 w-full lg:w-[62%]" />
      <div className={cn(WRAP, "grid items-center gap-x-10 gap-y-12 pt-12 pb-16 sm:pt-16 lg:min-h-[min(760px,calc(100dvh-64px))] lg:grid-cols-12 lg:py-20")}>
        <div className="lg:col-span-6">
          <h1
            id="hero-title"
            className="be-enter font-display text-display font-semibold text-balance text-ink"
            style={{ ["--rise" as string]: "18px" }}
          >
            Your next room, closer than you think.
          </h1>
          <p className="be-enter mt-6 max-w-[34rem] text-lead text-ink-2" style={{ ["--d" as string]: "110ms" }}>
            Find boarding houses, dorms, and rental spaces near your school or workplace. Compare prices, locations, and
            amenities before you inquire.
          </p>
          <div className="be-enter mt-9 flex flex-wrap gap-3" style={{ ["--d" as string]: "190ms", ["--rise" as string]: "8px" }}>
            <Link
              href="/find"
              className="group inline-flex h-13 items-center gap-2.5 rounded-md bg-clay px-6 text-[17px] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(180_70_48/0.7)] transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
            >
              Looking for a Board?
              <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
            <Link
              href="/owners"
              className="inline-flex h-13 items-center rounded-md bg-white px-6 text-[17px] font-semibold text-ink ring-1 ring-ink/15 transition-[background-color,scale] duration-150 hover:bg-porcelain active:scale-[0.97]"
            >
              List Your Property
            </Link>
          </div>
          <p className="be-enter mt-8 max-w-[34rem] border-t border-limestone pt-5 text-footnote text-subtle" style={{ ["--d" as string]: "260ms", ["--rise" as string]: "6px" }}>
            Bedspaces, dorms, boarding houses and apartments in Davao City, with rent shown per month.
          </p>
        </div>

        <HeroPhotos />
      </div>
    </section>
  );
}

function HeroPhotos() {
  return (
    <div className="relative lg:col-span-6 lg:col-start-7">
      <div className="relative ml-auto aspect-[4/5] w-full max-w-[520px] sm:w-[78%] lg:w-[82%]">
        {/* Main anchor: a lived-in single room in natural light */}
        <div className="be-settle absolute inset-0 overflow-hidden rounded-[28px] shadow-xl" style={{ ["--d" as string]: "80ms" }}>
          <Image
            src={heroRoom}
            alt="A small bedroom with a wooden wall, a desk under the window and a white chair"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 520px, (min-width: 640px) 78vw, 100vw"
            className="object-cover"
          />
        </div>

        {/* Location label: what the map would tell you */}
        <p
          className="be-enter absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-2 text-footnote font-medium text-ink shadow-md"
          style={{ ["--d" as string]: "420ms", ["--rise" as string]: "6px" }}
        >
          <MapPin className="size-3.5 text-clay" strokeWidth={2.2} />
          Near University of Mindanao, Matina
        </p>

        {/* Illustrative price card, clearly labelled */}
        <div
          className="be-enter absolute right-4 -bottom-7 w-[220px] rounded-2xl bg-white p-4 shadow-lg ring-1 ring-ink/5 sm:-right-6"
          style={{ ["--d" as string]: "500ms", ["--rise" as string]: "10px" }}
        >
          <p className="text-caption font-medium text-subtle">Example listing</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-title2 font-semibold tabular-nums text-ink">₱4,500</span>
            <span className="text-footnote text-subtle">/ month</span>
          </p>
          <p className="mt-0.5 text-footnote text-ink-2">Private room, 1.0 km away</p>
        </div>
      </div>

      {/* Supporting image: the building, set against the room for scale */}
      <div
        className="be-settle absolute -bottom-10 left-0 hidden aspect-[3/4] w-[34%] max-w-[230px] overflow-hidden rounded-[22px] shadow-lg ring-8 ring-porcelain sm:block"
        style={{ ["--d" as string]: "200ms" }}
      >
        <Image
          src={heroBuilding}
          alt="A low-rise apartment building with warm ochre walls among trees"
          fill
          placeholder="blur"
          sizes="230px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- What is BoardEase */

function WhatIs() {
  const card = DEMO_LISTINGS.find((l) => l.id === "demo-matina-private-desk") ?? DEMO_LISTINGS[0];
  return (
    <section aria-labelledby="what-title" className="pt-24 pb-24 sm:pt-32">
      <div className={cn(WRAP, "grid gap-14 lg:grid-cols-12 lg:gap-10")}>
        <div className="lg:col-span-5" data-reveal>
          <h2 id="what-title" className="font-display text-section font-semibold text-balance text-ink">
            Two sides of renting, in one place.
          </h2>
          <p className="mt-6 max-w-[36rem] text-prose text-ink-2">
            Renters search a map of rooms near where they study or work, and see the monthly rent before they ask.
          </p>
          <p className="mt-4 max-w-[36rem] text-prose text-ink-2">
            Owners keep their rooms, beds and tenants in one place, and publish only what they want renters to see.
          </p>
        </div>

        {/* Interface excerpts: what each side actually sees */}
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7 lg:col-start-6 lg:pl-6">
          <figure data-reveal className="flex flex-col">
            <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-ink/5">
              <div className="relative aspect-[16/10] bg-surface">
                <Image src={`${card.photos[0].src}.webp`} alt="" fill sizes="(min-width: 640px) 320px, 100vw" className="object-cover" />
                <span className="absolute top-2.5 left-2.5 rounded-sm bg-white/95 px-2 py-0.5 text-caption font-semibold text-warn">Demo</span>
              </div>
              <div className="px-4 pt-3 pb-4">
                <p className="text-callout font-semibold tabular-nums text-ink">
                  {formatPeso(card.monthlyPrice)} <span className="text-footnote font-normal text-subtle">/ month</span>
                </p>
                <p className="mt-0.5 text-body text-ink">{card.title}</p>
                <p className="mt-1 text-footnote text-subtle">
                  {PROPERTY_TYPE_LABEL[card.type]}, {card.district}
                </p>
              </div>
            </div>
            <figcaption className="mt-3 text-footnote text-subtle">
              <span className="font-semibold text-ink">What renters see.</span> Rent, room type and area first.
            </figcaption>
          </figure>

          <figure data-reveal style={{ ["--reveal-delay" as string]: "90ms" }} className="flex flex-col sm:mt-14">
            <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-ink/5">
              <p className="text-footnote font-semibold text-ink">Rooms</p>
              <table className="mt-3 w-full text-left text-footnote">
                <caption className="sr-only">Example room inventory</caption>
                <thead className="text-subtle">
                  <tr className="border-b border-limestone">
                    <th scope="col" className="pb-2 font-medium">Room</th>
                    <th scope="col" className="pb-2 text-right font-medium">Beds</th>
                    <th scope="col" className="pb-2 text-right font-medium">Free</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums text-ink">
                  {[
                    ["Room 1, single", 1, 0],
                    ["Room 2, shared", 3, 1],
                    ["Room 3, shared", 2, 2],
                  ].map(([room, beds, free]) => (
                    <tr key={room as string} className="border-b border-limestone/70 last:border-0">
                      <td className="py-2.5">{room}</td>
                      <td className="py-2.5 text-right">{beds}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn("inline-flex min-w-6 justify-center rounded-sm px-1.5 font-semibold", (free as number) > 0 ? "bg-garden-soft text-garden-ink" : "text-subtle")}>
                          {free}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="mt-3 text-footnote text-subtle">
              <span className="font-semibold text-ink">What owners manage.</span> Beds per room, so one full room never hides
              the free ones. Example data.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Two ways */

function TwoWays() {
  const renterFilters: [string, boolean][] = [
    ["Location", true],
    ["Budget", true],
    ["Distance", true],
    ["Room type", true],
    ["Amenities", false],
    ["Availability", false],
  ];
  const ownerTypes = ["Dormitories", "Boarding houses", "Bedspaces", "Apartments", "Rental rooms"];
  return (
    <section aria-labelledby="ways-title" className="bg-white py-24 sm:py-28">
      <div className={WRAP}>
        <h2 id="ways-title" data-reveal className="max-w-[18ch] font-display text-section font-semibold text-balance text-ink">
          Two ways to use BoardEase.
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          {/* Renters: light, photo-led */}
          <article data-reveal className="flex flex-col overflow-hidden rounded-[28px] bg-porcelain ring-1 ring-limestone lg:col-span-7">
            <div className="relative aspect-[16/9] lg:aspect-[16/10]">
              <Image src={renterRoom} alt="A single bed by a window with an orange cushion" fill placeholder="blur" sizes="(min-width: 1024px) 700px, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col p-7 sm:p-9">
              <h3 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.015em] text-ink">For renters</h3>
              <p className="mt-3 max-w-[40ch] text-prose text-ink-2">Find a place by what matters to you, and see the rent before you message anyone.</p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Search by">
                {renterFilters.map(([f, live]) => (
                  <li
                    key={f}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-footnote font-medium",
                      live ? "bg-white text-ink ring-1 ring-limestone" : "border border-dashed border-ink/25 text-subtle",
                    )}
                  >
                    {f}
                    {!live && <span className="text-caption">(soon)</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-8 lg:mt-auto lg:pt-8">
                <Link href="/find" className="inline-flex h-12 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
                  Find a Board <ArrowRight className="size-4" strokeWidth={2.2} />
                </Link>
              </div>
            </div>
          </article>

          {/* Owners: Limestone, type-led, the photo set smaller */}
          <article data-reveal style={{ ["--reveal-delay" as string]: "100ms" }} className="flex flex-col rounded-[28px] bg-limestone/55 p-7 ring-1 ring-limestone sm:p-9 lg:col-span-5">
            <h3 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.015em] text-ink">For property owners</h3>
            <p className="mt-3 max-w-[38ch] text-prose text-ink-2">Advertise your rooms and keep track of who lives where.</p>
            <ul className="mt-7 divide-y divide-ink/10 border-y border-ink/10">
              {ownerTypes.map((t) => (
                <li key={t} className="flex items-center justify-between py-3 text-body text-ink">
                  {t}
                  <span aria-hidden className="size-1.5 rounded-full bg-clay/70" />
                </li>
              ))}
            </ul>
            <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image src={ownerStreet} alt="A mid-rise apartment block with trees along a paved walkway" fill placeholder="blur" sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
            </div>
            <div className="mt-8 lg:mt-auto lg:pt-8">
              <Link href="/owners" className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-ink-2 active:scale-[0.97]">
                List Your Property <ArrowRight className="size-4" strokeWidth={2.2} />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Explore nearby */

function NearbySection() {
  return (
    <section aria-labelledby="nearby-title" className="bg-white pb-24 sm:pb-28">
      <div className={WRAP}>
        <div className="grid items-end gap-6 border-t border-limestone pt-20 lg:grid-cols-12">
          <div className="lg:col-span-6" data-reveal>
            <h2 id="nearby-title" className="font-display text-section font-semibold text-balance text-ink">
              See what is near, and what it costs.
            </h2>
          </div>
          <p className="text-prose text-ink-2 lg:col-span-5 lg:col-start-8" data-reveal>
            Prices sit on the map, so you can compare rent and distance at a glance. Pick one to see the room.
          </p>
        </div>
        <div className="mt-12" data-reveal>
          <NearbyPreview />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4" data-reveal>
          <p className="text-footnote text-subtle">Illustrative preview with demo listings. These rooms are not for rent.</p>
          <Link href="/find" className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-ink-2 active:scale-[0.97]">
            Open the finder <ArrowRight className="size-4" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- How it works */

const RENTER_STEPS = [
  ["Search a location", "Type your school, office or barangay. The map shows rooms within the distance you choose."],
  ["Compare spaces", "Rent per month, room type, distance and what is included, side by side."],
  ["Contact the owner", "Message the owner and arrange a viewing. The exact address comes after that."],
];
const OWNER_STEPS = [
  ["Register a property", "Add the building once, with its street and area. The exact address stays private."],
  ["Add rooms and availability", "Single rooms, shared rooms or bedspaces, each with its own rent and number of beds."],
  ["Receive inquiries, manage rentals", "Answer renters, record tenants, and keep the rent book in the same place."],
];

/** Also used by /how-it-works, which supplies its own page title (`titled={false}`). */
export function HowItWorks({ titled = true }: { titled?: boolean }) {
  return (
    <section aria-labelledby={titled ? "how-title" : undefined} aria-label={titled ? undefined : "Steps"} className={titled ? "py-24 sm:py-32" : "pb-24"}>
      <div className={WRAP}>
        {titled && (
          <h2 id="how-title" data-reveal className="font-display text-section font-semibold text-ink">
            How BoardEase works
          </h2>
        )}
        <div className={cn("grid gap-16 lg:grid-cols-2 lg:gap-20", titled && "mt-14")}>
          <Journey title="If you are looking for a room" steps={RENTER_STEPS} level={titled ? "h3" : "h2"} />
          <Journey title="If you rent out rooms" steps={OWNER_STEPS} level={titled ? "h3" : "h2"} />
        </div>
      </div>
    </section>
  );
}

// Heading level follows the page: h3 under the landing section title, h2 directly under a page h1
function Journey({ title, steps, level: H = "h3" }: { title: string; steps: string[][]; level?: "h2" | "h3" }) {
  return (
    <div>
      <H data-reveal className="text-callout font-semibold text-ink">{title}</H>
      <ol className="mt-6 border-t border-ink/15">
        {steps.map(([head, body], i) => (
          <li
            key={head}
            data-reveal
            style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
            className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-ink/15 py-7"
          >
            <span aria-hidden className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-clay tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-callout font-semibold text-ink">
                <span className="sr-only">Step {i + 1}: </span>
                {head}
              </p>
              <p className="mt-1.5 max-w-[42ch] text-body text-ink-2">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- Why BoardEase */

const NOW = [
  ["Map-based search", "Rooms placed on a map around the place you search, inside the distance you set."],
  ["Budget and room-type filters", "Only see what you can afford, and the kind of space you want."],
  ["Saved listings", "Keep a shortlist on your device while you compare."],
  ["Renter and owner accounts", "Sign up as a renter or an owner, with your own account page."],
];
const NEXT = [
  ["Room availability", "Free beds shown from each owner's real occupancy, not a guess."],
  ["Direct inquiries", "Message an owner and arrange a viewing inside BoardEase."],
  ["Property management", "Properties, rooms, beds and tenants for owners."],
  ["Rental billing", "Rent, electricity and water split per room, from the original BoardEase desktop app."],
];

function WhyBoardEase() {
  return (
    <section aria-labelledby="why-title" className="pb-28 sm:pb-32">
      <div className={cn(WRAP, "grid gap-12 border-t border-limestone pt-20 lg:grid-cols-12")}>
        <div className="lg:col-span-4" data-reveal>
          <h2 id="why-title" className="font-display text-section font-semibold text-balance text-ink">
            Why BoardEase
          </h2>
          <p className="mt-5 max-w-[32ch] text-prose text-ink-2">What works today, and what we are building next. We will not promise more than that.</p>
        </div>
        <div className="grid gap-12 sm:grid-cols-2 lg:col-span-8">
          <FeatureList title="Working today" tone="now" items={NOW} />
          <FeatureList title="In development" tone="next" items={NEXT} />
        </div>
      </div>
    </section>
  );
}

function FeatureList({ title, tone, items }: { title: string; tone: "now" | "next"; items: string[][] }) {
  return (
    <div data-reveal>
      <h3 className="flex items-center gap-2 text-footnote font-semibold text-ink">
        <span aria-hidden className={cn("size-2 rounded-full", tone === "now" ? "bg-garden" : "bg-limestone ring-1 ring-ink/20")} />
        {title}
      </h3>
      <ul className="mt-4 border-t border-ink/15">
        {items.map(([head, body]) => (
          <li key={head} className="border-b border-ink/10 py-5">
            <p className="text-callout font-semibold text-ink">{head}</p>
            <p className="mt-1 text-body text-ink-2">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- Final CTA */

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="bg-ink text-porcelain">
      <div className={cn(WRAP, "grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-12")}>
        <div className="lg:col-span-6" data-reveal>
          <span aria-hidden className="block h-1 w-12 rounded-full bg-clay" />
          <h2 id="cta-title" className="mt-8 font-display text-section font-semibold text-balance">
            Find a room, or fill one.
          </h2>
          <p className="mt-5 max-w-[36ch] text-prose text-porcelain/80">
            Start with the map if you are looking. Start with your rooms if you are renting them out.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/find" className="inline-flex h-13 items-center gap-2.5 rounded-md bg-clay px-6 text-[17px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
              Looking for a Board? <ArrowRight className="size-[18px]" strokeWidth={2.2} />
            </Link>
            <Link href="/owners" className="inline-flex h-13 items-center rounded-md px-6 text-[17px] font-semibold text-porcelain ring-1 ring-porcelain/30 transition-[background-color,scale] duration-150 hover:bg-porcelain/10 active:scale-[0.97]">
              List Your Property
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] lg:col-span-6" data-reveal>
          <Image src={ctaCorridor} alt="An open-air corridor of a residential building, lit by afternoon sun" fill placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
