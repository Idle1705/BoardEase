import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getDb } from "@/server/db";
import { listOwnerInquiries } from "@/server/marketplace/core";
import { manilaDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OwnerGate, PageSkeleton } from "../gate";
import { PageTitle, Panel } from "../ui";

export const metadata = { title: "Rental inquiries" };

export const STATUS = { new: "New", replied: "Replied", "viewing-set": "Viewing set", closed: "Resolved" } as const;

export default function InquiriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OwnerGate next="/owner/inquiries">{(user) => <Inbox userId={user.id} role={user.role} />}</OwnerGate>
    </Suspense>
  );
}

async function Inbox({ userId, role }: { userId: string; role: "renter" | "owner" | "admin" }) {
  const rows = await listOwnerInquiries(getDb(), { id: userId, role });
  return (
    <>
      <PageTitle title="Rental inquiries" intro="Questions and viewing requests from renters, for your listings only. Renters see your replies in their BoardEase inquiries." />
      <Panel className="p-0 sm:p-0">
        {rows.length ? (
          <ul className="divide-y divide-limestone/80">
            {rows.map((r) => {
              const unread = !r.ownerReadAt;
              return (
                <li key={r.id}>
                  <Link href={`/owner/inquiries/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 hover:bg-porcelain/60 sm:px-6">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-body text-ink">
                        {unread && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-clay" />}
                        <span className={cn("truncate", unread && "font-semibold")}>{r.renterName}</span>
                        <span className="shrink-0 text-footnote text-subtle">· {r.kind === "viewing" ? "Viewing request" : "Question"}</span>
                      </p>
                      <p className="mt-0.5 truncate text-footnote text-ink-2">
                        {r.listingTitle}: {r.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className={cn("text-footnote font-semibold", r.status === "new" ? "text-clay" : "text-ink-2")}>{STATUS[r.status]}</p>
                        <p className="text-caption text-subtle">{manilaDate(r.updatedAt)}</p>
                      </div>
                      <ChevronRight className="size-4 text-subtle" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-6 text-body text-ink-2">No inquiries yet. They arrive here once a listing is live and a renter asks about it.</p>
        )}
      </Panel>
    </>
  );
}
