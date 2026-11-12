"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Loader2, Send } from "lucide-react";
import { INQUIRY_MAX, INQUIRY_MIN } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { reportAction, sendInquiryAction, type FormResult } from "../../inquiries/actions";

const input =
  "w-full rounded-md bg-white px-3.5 text-body text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-clay";

export function InquiryForm({ listingId, rooms, today }: { listingId: string; rooms: { id: string; label: string }[]; today: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(sendInquiryAction.bind(null, listingId), {});
  const f = (state.fields ?? {}) as Record<string, string>;
  const [kind, setKind] = useState(f.kind || "question");
  const [share, setShare] = useState(f.sharePhone === "on");
  const [message, setMessage] = useState(f.message ?? "");

  if (state.ok && state.inquiryId)
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-xl bg-garden-soft p-5 text-garden-ink">
        <p className="flex items-start gap-2 text-body font-medium">
          <CircleCheck className="mt-0.5 size-5 shrink-0" /> {state.ok}
        </p>
        <Link href={`/inquiries/${state.inquiryId}`} className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-body font-medium text-white hover:bg-ink-2">
          Open your inquiry
        </Link>
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">What do you want to do?</legend>
        {[
          ["question", "Ask a question"],
          ["viewing", "Request a viewing"],
        ].map(([v, label]) => (
          <label key={v} className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-footnote font-semibold ring-1", kind === v ? "bg-ink text-white ring-ink" : "text-ink ring-ink/15 hover:bg-surface")}>
            <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />
            {label}
          </label>
        ))}
      </fieldset>
      {kind === "viewing" && (
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Preferred day
          <input type="date" name="preferredDate" min={today} defaultValue={f.preferredDate} required className={cn(input, "h-11 sm:w-56")} />
        </label>
      )}
      {rooms.length > 1 && (
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Room (optional)
          <select name="roomId" defaultValue={f.roomId ?? ""} className={cn(input, "h-11 sm:w-72")}>
            <option value="">Any room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
        Message
        <textarea
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={INQUIRY_MIN}
          maxLength={INQUIRY_MAX}
          required
          placeholder="When you'd move in, for how long, and anything you'd like to know."
          className={cn(input, "py-2.5 leading-relaxed")}
        />
        <span className="font-normal text-subtle">
          {message.trim().length}/{INQUIRY_MAX}. No links, please.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-body text-ink">
        <input type="checkbox" name="sharePhone" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 size-4 accent-[#b44630]" />
        <span>
          Share my mobile number with this owner
          <span className="block text-footnote text-subtle">Optional. Only this owner sees it, inside this inquiry.</span>
        </span>
      </label>
      {share && (
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Mobile number
          <input name="phone" inputMode="tel" autoComplete="tel" defaultValue={f.phone} placeholder="0917 123 4567" className={cn(input, "h-11 sm:w-56")} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white hover:bg-clay-hover disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />} Send to the owner
        </button>
        {state.error && (
          <p role="alert" className="flex items-start gap-1.5 text-footnote text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.error}
          </p>
        )}
      </div>
      <p className="text-caption text-subtle">Never pay a deposit or reservation fee before you&apos;ve seen the place in person.</p>
    </form>
  );
}

export function ReportForm({ listingId, reasons }: { listingId: string; reasons: [string, string][] }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(reportAction.bind(null, listingId), {});
  if (state.ok) return <p role="status" className="text-footnote text-garden-ink">{state.ok}</p>;
  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-footnote font-medium text-ink">What&apos;s wrong?</legend>
        {reasons.map(([v, label]) => (
          <label key={v} className="flex items-start gap-2.5 text-footnote text-ink">
            <input type="radio" name="reason" value={v} required className="mt-0.5 accent-[#b44630]" /> {label}
          </label>
        ))}
      </fieldset>
      <textarea name="details" rows={3} maxLength={1000} placeholder="Details (optional)" className={cn(input, "py-2 text-footnote")} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-md px-4 text-footnote font-semibold text-ink ring-1 ring-ink/15 hover:bg-surface disabled:opacity-60">
          Send report
        </button>
        {state.error && (
          <p role="alert" className="text-footnote text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
