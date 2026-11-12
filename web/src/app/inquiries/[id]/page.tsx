import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { getThread, MarketError } from "@/server/marketplace/core";
import { manilaDate, manilaDateTime } from "@/lib/format";
import { Messages, ReplyBox, StatusButtons } from "@/components/inquiries/thread";
import { renterCloseAction, renterReplyAction } from "../actions";

export const metadata = { title: "Inquiry" };
export const instant = false;

export default function RenterThreadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-porcelain">
      <div className="mx-auto max-w-[760px] px-4 py-8 sm:py-12">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
          <Thread params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/inquiries/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let t;
  try {
    t = await getThread(getDb(), { id: user.id, role: user.role }, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  if (t.asOwner) redirect(`/owner/inquiries/${id}`);
  const i = t.inquiry;
  const closed = i.status === "closed";
  return (
    <>
      <Link href="/inquiries" className="mb-4 inline-flex h-10 items-center gap-1 text-footnote font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" /> Your inquiries
      </Link>
      <h1 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.02em] text-ink">{i.listingTitle}</h1>
      <p className="mt-1 text-body text-ink-2">
        With {t.ownerName}
        {i.roomLabel ? ` · about ${i.roomLabel}` : ""} ·{" "}
        <Link href={`/listings/${i.listingId}`} className="font-medium text-ink underline-offset-4 hover:underline">
          View listing
        </Link>
      </p>
      <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-white/60 p-5 ring-1 ring-ink/8 sm:p-6">
        {i.preferredViewingDate && (
          <p className="inline-flex items-center gap-2 self-start rounded-md bg-white px-3 py-2 text-footnote text-ink ring-1 ring-ink/8">
            <CalendarDays className="size-4 text-clay" /> You asked to view on {manilaDate(new Date(`${i.preferredViewingDate}T00:00:00+08:00`))}
          </p>
        )}
        <Messages
          opening={{ id: "opening", body: i.message, mine: true, author: "You", at: manilaDateTime(i.createdAt) }}
          messages={t.messages.map((m) => ({ id: m.id, body: m.body, mine: m.mine, author: m.fromOwner ? t.ownerName : "You", at: manilaDateTime(m.createdAt) }))}
        />
        {closed ? (
          <p className="text-footnote text-subtle">This inquiry is closed.</p>
        ) : (
          <>
            <ReplyBox action={renterReplyAction.bind(null, id)} placeholder="Write to the owner. Never send money before you've seen the place." />
            <StatusButtons options={[{ value: "closed", label: "Close this inquiry", current: false }]} onSet={renterCloseAction.bind(null, id)} />
          </>
        )}
      </div>
    </>
  );
}
