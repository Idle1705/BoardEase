import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export const metadata = { title: "About" };

export default function About() {
  return (
    <ContentPage
      title="About BoardEase"
      intro="BoardEase started as a desktop app for running a boarding house: rooms, tenants, and monthly bills split fairly between the people in a room."
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Where it is going</h2>
        <p>
          The web version adds the other half: a map where renters in Davao City can find bedspaces, dorms, boarding
          houses and apartments, see the monthly rent, and contact the owner. Owners keep managing their rooms in the
          same place.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Where it is now</h2>
        <p>
          BoardEase is preparing a small pilot in Davao City. Owners can create listings with their own photos; each
          one is reviewed before it appears on the map, and renters message owners inside BoardEase. Tenant records
          and billing come later.
        </p>
      </section>
      <p>
        <Link href="/find" className="font-medium text-clay underline underline-offset-2">Try the finder</Link> or read{" "}
        <Link href="/how-it-works" className="font-medium text-clay underline underline-offset-2">how it works</Link>.
      </p>
    </ContentPage>
  );
}
