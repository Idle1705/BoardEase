import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { adminQueues, REPORT_REASONS } from "@/server/marketplace/core";
import { manilaDate } from "@/lib/format";
import { ReportControls, ReviewControls } from "./review-controls";

/*
 * BoardEase review (admins only; admin is granted by hand in the database, never by sign-up).
 * Checks a listing looks genuine and complete before its owner can publish it, and handles reports.
 * Admins never publish for an owner and can't review their own listings.
 */

export const metadata = { title: "Review", robots: { index: false } };

export default function AdminPage() {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-[#fbfaf7]">
      <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8">
        <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink">Review</h1>
        <p className="mt-1.5 max-w-[64ch] text-body text-ink-2">
          Before approving, check the photos look like a real place (not stock or copied), the prices and rooms make sense, and the owner&apos;s description matches. Open each listing to see it as renters will.
        </p>
        <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />}>
          <Queues />
        </Suspense>
      </div>
    </main>
  );
}

async function Queues() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.role !== "admin")
    return <p className="mt-8 rounded-2xl bg-white p-6 text-body text-ink-2 shadow-sm">This area is for BoardEase reviewers.</p>;
  const { submitted, reports } = await adminQueues(getDb(), { id: user.id, role: user.role });
  return (
    <div className="mt-8 flex flex-col gap-8">
      <section aria-labelledby="queue-title" className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 id="queue-title" className="text-callout font-semibold text-ink">
          Waiting for review ({submitted.length})
        </h2>
        {submitted.length ? (
          <ul className="mt-4 divide-y divide-limestone">
            {submitted.map((l) => (
              <li key={l.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                  <Link href={`/listings/${l.id}`} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-footnote text-ink-2">
                    {l.ownerName} · {l.district} · sent {l.submittedAt ? manilaDate(l.submittedAt) : ""}
                  </p>
                </div>
                <ReviewControls listingId={l.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-ink-2">Nothing waiting.</p>
        )}
      </section>

      <section aria-labelledby="reports-title" className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 id="reports-title" className="text-callout font-semibold text-ink">
          Open reports ({reports.length})
        </h2>
        {reports.length ? (
          <ul className="mt-4 divide-y divide-limestone">
            {reports.map((r) => (
              <li key={r.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_380px]">
                <div>
                  {r.listingId ? (
                    <Link href={`/listings/${r.listingId}`} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
                      {r.listingTitle}
                    </Link>
                  ) : (
                    <p className="text-body font-semibold text-ink">Listing removed</p>
                  )}
                  <p className="text-footnote text-ink-2">
                    {REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason} · {manilaDate(r.createdAt)} · listing {r.listingStatus}
                  </p>
                  {r.details && <p className="mt-1 text-footnote text-ink">{r.details}</p>}
                </div>
                <ReportControls reportId={r.id} listingId={r.listingId} live={r.listingStatus === "published"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-ink-2">No open reports.</p>
        )}
      </section>
    </div>
  );
}
