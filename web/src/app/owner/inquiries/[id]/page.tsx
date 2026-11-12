import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { getDb } from "@/server/db";
import { getThread, MarketError } from "@/server/marketplace/core";
import { manilaDate, manilaDateTime } from "@/lib/format";
import { Messages, ReplyBox, SharedPhone, StatusButtons } from "@/components/inquiries/thread";
import { ownerInquiryStatusAction, ownerReplyAction } from "../../listing-actions";
import { OwnerGate, PageSkeleton } from "../../gate";
import { PageTitle, Panel } from "../../ui";

export const metadata = { title: "Inquiry" };
export const instant = false;

export default function OwnerInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerGate next={`/owner/inquiries/${id}`}>{(user) => <Thread id={id} userId={user.id} role={user.role} />}</OwnerGate>;
}

async function Thread({ id, userId, role }: { id: string; userId: string; role: "renter" | "owner" | "admin" }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let t;
  try {
    t = await getThread(getDb(), { id: userId, role }, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  if (!t.asOwner) notFound(); // renters use /inquiries/[id]
  const i = t.inquiry;
  const closed = i.status === "closed";
  return (
    <>
      <Link href="/owner/inquiries" className="mb-4 inline-flex h-10 items-center gap-1 text-footnote font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" /> Rental inquiries
      </Link>
      <PageTitle title={`${t.renterName} · ${i.kind === "viewing" ? "Viewing request" : "Question"}`} intro={`About ${i.listingTitle}${i.roomLabel ? `, ${i.roomLabel}` : ""}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] [&>*]:min-w-0">
        <Panel className="flex flex-col gap-5 bg-porcelain/60">
          {i.preferredViewingDate && (
            <p className="inline-flex items-center gap-2 self-start rounded-md bg-white px-3 py-2 text-footnote text-ink ring-1 ring-ink/8">
              <CalendarDays className="size-4 text-clay" /> Asked to view on {manilaDate(new Date(`${i.preferredViewingDate}T00:00:00+08:00`))}
            </p>
          )}
          {i.renterPhone && <SharedPhone phone={i.renterPhone} />}
          <Messages
            opening={{ id: "opening", body: i.message, mine: false, author: t.renterName, at: manilaDateTime(i.createdAt) }}
            messages={t.messages.map((m) => ({ id: m.id, body: m.body, mine: m.mine, author: m.fromOwner ? "You" : t.renterName, at: manilaDateTime(m.createdAt) }))}
          />
          {closed ? (
            <p className="text-footnote text-subtle">This inquiry is resolved. Reopen it below to reply again.</p>
          ) : (
            <ReplyBox action={ownerReplyAction.bind(null, id)} placeholder="Reply to the renter. Share the exact address only when you've agreed a viewing." />
          )}
        </Panel>
        <Panel title="Status">
          <StatusButtons
            options={[
              { value: "replied", label: closed ? "Reopen" : "Replied", current: i.status === "replied" || i.status === "new" },
              { value: "viewing-set", label: "Viewing set", current: i.status === "viewing-set" },
              { value: "closed", label: "Resolved", current: closed },
            ]}
            onSet={ownerInquiryStatusAction.bind(null, id) as (v: string) => Promise<{ ok?: string; error?: string }>}
          />
          <p className="mt-4 text-footnote text-subtle">
            When a bed is taken, update it on the property page so the finder stays accurate.
          </p>
        </Panel>
      </div>
    </>
  );
}
