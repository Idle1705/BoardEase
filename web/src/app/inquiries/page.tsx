import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronRight } from "lucide-react";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { listRenterInquiries } from "@/server/marketplace/core";
import { manilaDate } from "@/lib/format";

export const metadata = { title: "Your inquiries" };

const STATUS = { new: "Waiting for the owner", replied: "Owner replied", "viewing-set": "Viewing set", closed: "Closed" } as const;

export default function RenterInquiriesPage() {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-porcelain">
      <div className="mx-auto max-w-[760px] px-4 py-10 sm:py-14">
        <h1 className="font-display text-[34px] leading-tight font-semibold tracking-[-0.02em] text-ink">Your inquiries</h1>
        <p className="mt-2 text-body text-ink-2">Questions and viewing requests you sent to owners. Replies arrive here; BoardEase doesn&apos;t send email or SMS yet.</p>
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
          <List />
        </Suspense>
      </div>
    </main>
  );
}

async function List() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/inquiries");
  const rows = await listRenterInquiries(getDb(), { id: user.id, role: user.role });
  if (!rows.length)
    return (
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-body text-ink-2">You haven&apos;t asked about a place yet.</p>
        <Link href="/find" className="mt-4 inline-flex h-11 items-center rounded-md bg-clay px-5 text-body font-semibold text-white hover:bg-clay-hover">
          Find a room
        </Link>
      </div>
    );
  return (
    <ul className="mt-8 divide-y divide-limestone/80 overflow-hidden rounded-2xl bg-white shadow-sm">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/inquiries/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 hover:bg-porcelain/60">
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-ink">{r.listingTitle}</p>
              <p className="mt-0.5 truncate text-footnote text-ink-2">
                {r.ownerName} · {r.message}
              </p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className={r.status === "replied" || r.status === "viewing-set" ? "text-footnote font-semibold text-garden-ink" : "text-footnote text-ink-2"}>{STATUS[r.status]}</p>
                <p className="text-caption text-subtle">{manilaDate(r.updatedAt)}</p>
              </div>
              <ChevronRight className="size-4 text-subtle" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
