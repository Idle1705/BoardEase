import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import ownerStreet from "../../../public/editorial/owner-street.jpg";

export const metadata = { title: "List your property" };

const NOW = [
  ["Owner account", "Sign up as an owner. Your role is stored on our side, not in your browser."],
  ["Properties", "Add each building with its street and barangay. The exact address stays private."],
  ["Rooms and beds", "Single rooms, shared rooms rented per bed, or whole units, each with its own rent."],
  ["Availability per bed", "Free beds counted from your tenant records, so one full room never hides the free ones."],
];
const SOON = [
  ["Published listings with your photos", "You choose what renters see. Photos are yours, never stock pictures."],
  ["Rental inquiries", "Messages and viewing requests in one inbox."],
  ["Tenants", "Who lives in which bed, moving in and out."],
  ["Billing and payments", "Rent, electricity and water split per room, from the original BoardEase desktop app."],
];

export default function Owners() {
  return (
    <main id="main" className="flex-1 overflow-y-auto overflow-x-clip bg-porcelain">
      <section className="be-daylight">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-6">
            <h1 className="font-display text-display font-semibold text-balance text-ink">Fill your rooms, keep track of every bed.</h1>
            <p className="mt-6 max-w-[34rem] text-lead text-ink-2">
              BoardEase is for boarding houses, dorms, bedspaces and small apartments in Davao City. List your rooms
              for renters nearby, and manage who lives where in the same place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up?role=owner"
                className="inline-flex h-13 items-center gap-2.5 rounded-md bg-clay px-6 text-[17px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-clay-hover active:scale-[0.97]"
              >
                Create an owner account <ArrowRight className="size-[18px]" strokeWidth={2.2} />
              </Link>
              <Link
                href="/owner/dashboard"
                className="inline-flex h-13 items-center rounded-md bg-white px-6 text-[17px] font-semibold text-ink ring-1 ring-ink/15 transition-[background-color,scale] duration-150 hover:bg-porcelain active:scale-[0.97]"
              >
                Go to the owner portal
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-xl lg:col-span-6">
            <Image src={ownerStreet} alt="A mid-rise apartment block with trees along a paved walkway" fill priority placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10">
          <h2 className="font-display text-section font-semibold text-balance text-ink lg:col-span-4">What owners get</h2>
          <div className="grid gap-12 sm:grid-cols-2 lg:col-span-8">
            <List title="Working today" live items={NOW} />
            <List title="In development" items={SOON} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-10">
        <div className="max-w-[46rem]">
          <h2 className="font-display text-section font-semibold text-ink">Your tenants&apos; details stay private</h2>
          <p className="mt-5 text-prose text-ink-2">
            Renters only ever see a listing: the rent, the room and the area. Tenant names, contact numbers, bills and
            payments are visible to you alone, and every owner page checks on our server that the records are yours.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function List({ title, items, live }: { title: string; items: string[][]; live?: boolean }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-footnote font-semibold text-ink">
        <span aria-hidden className={live ? "size-2 rounded-full bg-garden" : "size-2 rounded-full bg-limestone ring-1 ring-ink/20"} />
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
