import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export const metadata = { title: "How it works" };

const renterSteps = [
  ["Search near where you study or work", "Type a school, mall or barangay. BoardEase draws your distance limit on the map."],
  ["Compare rent, distance and bills", "Each listing shows the monthly rent, what the bills cover and how far it is from your search."],
  ["Save, then ask for a viewing", "Keep a shortlist, then message owners and agree a viewing. The exact address is shared after that."],
];

const ownerSteps = [
  ["Add your property and rooms", "Bedspaces, shared rooms, private rooms or whole units, each with its own rent and capacity."],
  ["Publish listings with photos", "Choose what renters see. The map shows only the approximate area until you share the address."],
  ["Run the boarding house", "Track tenants, split rent and utilities per room, record payments and see overdue balances."],
];

export default function HowItWorks() {
  return (
    <ContentPage
      title="How BoardEase works"
      intro="One place for renters to find a room in Davao City, and for owners to fill rooms and keep the billing straight."
    >
      <Steps heading="If you are looking for a room" steps={renterSteps} />
      <Steps heading="If you rent out rooms" steps={ownerSteps} />
      <p>
        BoardEase is in development. The listings on the map today are demonstrations.{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2">
          Try the search
        </Link>
      </p>
    </ContentPage>
  );
}

function Steps({ heading, steps }: { heading: string; steps: string[][] }) {
  return (
    <section>
      <h2 className="text-title3 font-semibold text-ink">{heading}</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-footnote font-semibold text-ink">
              {i + 1}
            </span>
            <span>
              <span className="block font-medium text-ink">{t}</span>
              {d}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
