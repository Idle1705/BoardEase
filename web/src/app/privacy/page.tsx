import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export const metadata = { title: "Privacy", robots: { index: false } };

/*
 * DRAFT privacy notice for the pilot (Republic Act 10173, Data Privacy Act of 2012). It describes what the
 * code actually does today. It must be reviewed by a lawyer and get a named Data Protection Officer and
 * contact before the public pilot (docs/web/LAUNCH-READINESS.md).
 */
export default function Privacy() {
  return (
    <ContentPage title="Privacy" intro="What BoardEase collects, why, who can see it, and your rights under the Data Privacy Act of 2012 (RA 10173).">
      <p className="rounded-md bg-[#fdf6e7] px-4 py-3 text-footnote text-warn">
        Draft for the pilot. This notice is being reviewed before BoardEase opens to the public; the contact details of our Data Protection Officer will be added here.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">What we collect</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Your account: name, email address and password (the password is stored hashed by our sign-in provider, never in plain text).</li>
          <li>Owners: properties, rooms, rents, availability and photos you upload. The exact address and exact map point are stored privately; the public map shows the street and barangay with a point moved 80 to 180 metres.</li>
          <li>Owners who choose to: a mobile number shown on their listing.</li>
          <li>Renters: the inquiries and messages you send, the viewing day you ask for, and, only if you tick the box, your mobile number for that one owner.</li>
          <li>Reports you send about a listing.</li>
        </ul>
        <p>Photos are re-encoded when uploaded, which removes hidden data such as the GPS location where they were taken.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Who can see it</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Everyone: published listings (title, description, photos, rooms, rents, availability, street and barangay, and the owner&apos;s display name).</li>
          <li>An owner: inquiries sent to their own listings, with the renter&apos;s display name, and the renter&apos;s number only if the renter shared it. Owners never see a renter&apos;s email.</li>
          <li>A renter: their own inquiries and the owner&apos;s replies.</li>
          <li>BoardEase reviewers: listings sent for review and reports, to keep fake or wrong listings off the map.</li>
        </ul>
        <p>We don&apos;t sell personal data or show advertising.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Where it is stored</h2>
        <p>
          Our database, sign-in and photo storage run on Neon in Singapore (AWS ap-southeast-1); the website is hosted on Vercel. These providers process data on our behalf.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">How long we keep it</h2>
        <p>
          Accounts and listings stay while the account is open. Closed inquiries are kept for 12 months so both sides can refer back, then deleted. When you delete your account, your inquiries, messages and listings are removed.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title3 font-semibold text-ink">Your rights</h2>
        <p>
          You can ask to see the data we hold about you, correct it, have it deleted, or object to how it is used, and you can complain to the{" "}
          <a href="https://privacy.gov.ph" className="font-medium text-clay underline underline-offset-2">
            National Privacy Commission
          </a>
          . You can correct most details yourself in your <Link href="/account" className="font-medium text-clay underline underline-offset-2">account</Link> and owner portal.
        </p>
      </section>
    </ContentPage>
  );
}
