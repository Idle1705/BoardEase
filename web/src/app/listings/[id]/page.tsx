import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Bath, CalendarClock, ChevronLeft, Info, MapPin, Phone, ShieldAlert, Sofa, Zap } from "lucide-react";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { getListingForViewer, REPORT_REASONS } from "@/server/marketplace/core";
import { photoUrl } from "@/server/storage";
import { BASIS_LABEL } from "@/lib/marketplace";
import { PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { formatPeso, manilaDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Gallery } from "@/components/explore/gallery";
import { InquiryForm, ReportForm } from "./inquiry-form";

/*
 * Public listing page (docs/web/MARKETPLACE.md). Shows only public columns: street and barangay, never
 * the exact address. Live = published and availability confirmed within 30 days. The owner and admins
 * also see non-live listings here as a preview, clearly marked.
 */

export const instant = false;

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-porcelain">
      <Suspense fallback={<div className="mx-auto mt-10 h-96 max-w-[1120px] animate-pulse rounded-2xl bg-white" aria-busy="true" />}>
        <Listing params={params} />
      </Suspense>
    </main>
  );
}

async function Listing({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  const now = new Date();
  const found = await getListingForViewer(getDb(), id, user ? { id: user.id, role: user.role } : null, now);
  if (!found) notFound();
  const { listing: l, live, status, isOwner } = found;
  const photos = l.photos.map((p) => ({ src: photoUrl(p.key).replace(/\.webp$/, ""), alt: p.alt, width: p.width, height: p.height }));
  const confirmedDays = Math.floor((now.getTime() - l.confirmedAt.getTime()) / 86_400_000);
  const open = l.rooms.filter((r) => r.free > 0);
  const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-6 pb-20 sm:px-8">
      <Link href="/find" className="mb-4 inline-flex h-10 items-center gap-1 text-footnote font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" /> Back to the finder
      </Link>

      {!live && (
        <p className="mb-5 flex items-start gap-2 rounded-lg bg-[#fdf6e7] px-4 py-3 text-footnote text-warn">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-semibold">Preview, not live.</span> Only {isOwner ? "you" : "the owner and BoardEase reviewers"} can see this page. Status: {status}
            {status === "published" ? ", availability needs confirming" : ""}.
          </span>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="flex flex-col gap-8">
          {photos.length ? (
            <Gallery photos={photos} sizes="(min-width: 1024px) 720px, 100vw" className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-limestone" expandTitle={l.title} />
          ) : (
            <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-limestone text-footnote text-subtle">No photos yet</div>
          )}

          <div>
            <p className="text-footnote font-medium text-clay">{PROPERTY_TYPE_LABEL[l.type]}</p>
            <h1 className="mt-1 font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.025em] text-balance text-ink">{l.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-body text-ink-2">
              <MapPin className="size-4 text-subtle" /> {l.street}, {l.district}, {l.city}
            </p>
          </div>

          <section aria-labelledby="rooms-title">
            <h2 id="rooms-title" className="text-callout font-semibold text-ink">
              Rooms and availability
            </h2>
            <ul className="mt-3 divide-y divide-limestone overflow-hidden rounded-xl bg-white ring-1 ring-ink/6">
              {l.rooms.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <p className="text-body font-semibold text-ink">{r.label}</p>
                    <p className="text-footnote text-subtle">Rented {BASIS_LABEL[r.basis]}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <p className="text-body font-semibold tabular-nums text-ink">
                      {formatPeso(r.rentCents / 100)}
                      <span className="text-footnote font-normal text-subtle"> / month{r.basis === "bed" ? " per bed" : ""}</span>
                    </p>
                    <span className={cn("inline-flex min-w-[5.5rem] justify-center rounded-md px-2 py-0.5 text-footnote font-semibold tabular-nums", r.free > 0 ? "bg-garden-soft text-garden-ink" : "bg-surface text-subtle")}>
                      {r.basis === "bed" ? `${r.free} of ${r.total} free` : r.free > 0 ? "Available" : "Taken"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-caption text-subtle">
              The owner confirmed this availability {confirmedDays <= 0 ? "today" : `${confirmedDays} day${confirmedDays === 1 ? "" : "s"} ago`} ({manilaDate(l.confirmedAt)}).
            </p>
          </section>

          <section aria-labelledby="about-title">
            <h2 id="about-title" className="text-callout font-semibold text-ink">
              About this place
            </h2>
            <p className="mt-2 max-w-[68ch] text-body leading-relaxed whitespace-pre-line text-ink-2">{l.description}</p>
            <ul className="mt-5 grid gap-x-6 gap-y-3 text-footnote text-ink-2 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Bath className="size-4 text-subtle" /> {l.bathroom === "private" ? "Own bathroom" : "Shared bathroom"}
              </li>
              <li className="flex items-center gap-2">
                <Sofa className="size-4 text-subtle" /> {l.furnished ? "Furnished" : "Unfurnished"}
              </li>
              <li className="flex items-center gap-2">
                <CalendarClock className="size-4 text-subtle" /> Minimum stay {l.minimumStayMonths} month{l.minimumStayMonths === 1 ? "" : "s"}
              </li>
              {l.utilitiesNote && (
                <li className="flex items-center gap-2">
                  <Zap className="size-4 text-subtle" /> {l.utilitiesNote}
                </li>
              )}
            </ul>
            {l.amenities.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {l.amenities.map((a) => (
                  <li key={a} className="rounded-md bg-white px-2.5 py-1 text-footnote text-ink-2 ring-1 ring-ink/6">
                    {a}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-5 text-footnote text-subtle">The location shown is the street and barangay. Owners share the exact address once a viewing is agreed.</p>
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
            {open.length ? (
              <p className="flex items-baseline gap-1.5">
                {open.length > 1 && <span className="text-footnote text-subtle">from</span>}
                <span className="font-display text-[30px] font-semibold tabular-nums text-ink">{formatPeso(l.priceFromCents / 100)}</span>
                <span className="text-footnote text-subtle">/ month</span>
              </p>
            ) : (
              <p className="text-callout font-semibold text-ink">Fully taken right now</p>
            )}
            <p className="mt-1 text-footnote text-ink-2">
              {l.freeSpaces > 0 ? `${l.freeSpaces} ${l.freeSpaces === 1 ? "space" : "spaces"} free` : "No free spaces at the moment"} · listed by {l.ownerName}
            </p>
            {l.ownerPhone && (
              <p className="mt-3 inline-flex items-center gap-2 text-footnote text-ink">
                <Phone className="size-4 text-clay" /> <a href={`tel:${l.ownerPhone}`} className="font-semibold underline-offset-4 hover:underline">{l.ownerPhone.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3")}</a>
              </p>
            )}
          </div>

          <div id="inquire" className="scroll-mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
            <h2 className="text-callout font-semibold text-ink">Ask the owner</h2>
            <div className="mt-4">
              {isOwner ? (
                <p className="text-footnote text-ink-2">This is your listing. Inquiries arrive in your owner portal.</p>
              ) : !live || l.freeSpaces === 0 ? (
                <p className="text-footnote text-ink-2">This listing isn&apos;t taking inquiries right now.</p>
              ) : user ? (
                <InquiryForm listingId={l.id} rooms={open.map((r) => ({ id: r.id, label: r.label }))} today={today} />
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-footnote text-ink-2">Sign in or create a free account to message the owner or request a viewing. Your email is never shown to owners.</p>
                  <Link href={`/sign-in?next=${encodeURIComponent(`/listings/${l.id}#inquire`)}`} className="inline-flex h-11 items-center rounded-md bg-clay px-5 text-body font-semibold text-white hover:bg-clay-hover">
                    Sign in to ask
                  </Link>
                </div>
              )}
            </div>
          </div>

          {!isOwner && live && (
            <details className="rounded-2xl bg-white/60 px-5 py-4 ring-1 ring-ink/6">
              <summary className="flex cursor-pointer items-center gap-2 text-footnote font-medium text-ink-2">
                <ShieldAlert className="size-4" /> Report this listing
              </summary>
              {user ? (
                <ReportForm listingId={l.id} reasons={Object.entries(REPORT_REASONS)} />
              ) : (
                <p className="mt-3 text-footnote text-ink-2">
                  <Link href={`/sign-in?next=${encodeURIComponent(`/listings/${l.id}`)}`} className="font-semibold underline">Sign in</Link> to report a wrong or unauthorised listing.
                </p>
              )}
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
