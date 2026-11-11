import { ContentPage } from "@/components/content-page";

export const metadata = { title: "List your property" };

export default function Owners() {
  return (
    <ContentPage
      title="List your rooms on BoardEase"
      intro="Owner accounts are not open yet. This page explains what they will do."
    >
      <section>
        <h2 className="text-title3 font-semibold text-ink">What owners will get</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Property and room inventory, with rent and capacity per room.</li>
          <li>Listings with photos, published or hidden per room.</li>
          <li>Rental inquiries and viewing requests in one inbox.</li>
          <li>Monthly bills that split rent, electricity and water fairly between the people in a room.</li>
          <li>Payments, partial payments and overdue balances, with printable statements.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-title3 font-semibold text-ink">Your tenants&apos; details stay private</h2>
        <p className="mt-2">
          Renters only ever see the listing. Tenant names, contact numbers, bills and payments are visible to you alone.
        </p>
      </section>
    </ContentPage>
  );
}
