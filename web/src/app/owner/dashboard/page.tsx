import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { countNewInquiries, getOwnerInventory } from "@/server/owner";
import { OwnerGate, PageSkeleton } from "../gate";
import { FreeBeds, PageTitle, Panel } from "../ui";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OwnerGate next="/owner/dashboard">{(user) => <Dashboard ownerId={user.id} name={user.name} />}</OwnerGate>
    </Suspense>
  );
}

async function Dashboard({ ownerId, name }: { ownerId: string; name: string }) {
  const [props, newInquiries] = await Promise.all([getOwnerInventory(ownerId), countNewInquiries(ownerId)]);
  const rooms = props.reduce((a, p) => a + p.rooms.length, 0);
  const capacity = props.reduce((a, p) => a + p.capacity, 0);
  const occupied = props.reduce((a, p) => a + p.occupied, 0);
  const first = name.split(" ")[0];

  if (!props.length) {
    return (
      <>
        <PageTitle title={`Welcome, ${first}`} intro="Your numbers appear here once you add a property and its rooms." />
        {/* Getting started: the real order of work, so the empty portal shows where it leads.
            Replaces an icon-in-a-tile header (a template tell) with information. */}
        <Panel className="p-6 sm:p-8">
          <h2 className="text-title3 font-semibold text-ink">Get your rooms in front of renters</h2>
          <ol className="mt-6 flex flex-col">
            {[
              ["Add your property", "The building, with its street and barangay. The exact address stays private.", "now"],
              ["Add its rooms and beds", "Single rooms, shared rooms rented per bed, or whole units, each with its own rent.", "next"],
              ["Publish a listing", "Choose what renters see. Listings arrive in a later update.", "later"],
            ].map(([head, body, when], i) => (
              <li key={head} className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-t border-limestone py-5 first:border-t-0 first:pt-0">
                <span
                  aria-hidden
                  className={
                    when === "now"
                      ? "grid size-9 place-items-center rounded-full bg-clay font-display text-callout font-semibold text-white tabular-nums"
                      : "grid size-9 place-items-center rounded-full font-display text-callout font-semibold text-subtle tabular-nums ring-1 ring-ink/15"
                  }
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-callout font-semibold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {head}
                  </h3>
                  <p className="mt-1 max-w-[52ch] text-body text-ink-2">{body}</p>
                  {when === "now" && (
                    <Link href="/owner/properties" className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]">
                      Add a property <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </>
    );
  }

  // Every figure below is counted from your records; nothing is estimated.
  const free = capacity - occupied;
  const pct = capacity ? Math.round((occupied / capacity) * 100) : 0;
  return (
    <>
      <PageTitle title={`Welcome back, ${first}`} intro="Counted from your properties, rooms and current tenants." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Focal figure: beds. Occupancy is what an owner checks first. */}
        <section aria-labelledby="beds-title" className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
          <h2 id="beds-title" className="text-footnote font-semibold text-subtle">Beds</h2>
          <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
            <p>
              <span className="font-display text-[56px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-ink">{occupied}</span>
              <span className="ml-2 text-callout text-ink-2">of {capacity} occupied</span>
            </p>
            <p className="pb-1.5">
              <span className="font-display text-[32px] leading-none font-semibold tabular-nums text-garden-ink">{free}</span>
              <span className="ml-2 text-callout text-ink-2">free to rent</span>
            </p>
          </div>
          <div
            role="img"
            aria-label={`${pct}% of beds occupied`}
            className="mt-6 flex h-3 overflow-hidden rounded-full bg-garden-soft"
          >
            <span className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-footnote text-subtle">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-ink" /> Occupied</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-garden" /> Free</span>
            <span>{pct}% occupied</span>
          </p>
        </section>

        <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {(
            [
              ["Properties", props.length],
              ["Rooms", rooms],
              ["New inquiries", newInquiries],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col justify-between gap-2 rounded-2xl bg-white px-4 py-3.5 shadow-sm lg:flex-row lg:items-center">
              <dt className="text-footnote text-subtle">{label}</dt>
              <dd className="font-display text-[26px] leading-none font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Panel title="Your properties" className="mt-4">
        <ul className="divide-y divide-limestone">
          {props.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <Link href={`/owner/properties/${p.id}`} className="text-body font-medium text-ink hover:text-clay">
                  {p.name}
                </Link>
                <p className="text-footnote text-subtle">
                  {p.street}, {p.district} · {p.rooms.length} {p.rooms.length === 1 ? "room" : "rooms"}
                </p>
              </div>
              <FreeBeds free={p.free} capacity={p.capacity} />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
