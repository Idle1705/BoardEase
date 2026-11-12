"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { pauseAction, resolveReportAction, reviewAction, type AdminResult } from "./actions";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(r.ok ?? "Done.");
        router.refresh();
      }
    });
  return { pending, run };
}

const btn = "inline-flex h-10 items-center rounded-md px-4 text-footnote font-semibold disabled:opacity-60";

export function ReviewControls({ listingId }: { listingId: string }) {
  const [note, setNote] = useState("");
  const { pending, run } = useRun();
  return (
    <div className="flex flex-col gap-2">
      <label className="sr-only" htmlFor={`note-${listingId}`}>
        Note to the owner
      </label>
      <textarea
        id={`note-${listingId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Note to the owner (required to request changes)"
        className="w-full rounded-md bg-white px-3 py-2 text-footnote ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-clay"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => reviewAction(listingId, "approved", note))} className={`${btn} bg-garden text-white hover:bg-garden/90`}>
          Approve
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => reviewAction(listingId, "rejected", note))} className={`${btn} text-ink ring-1 ring-ink/15 hover:bg-surface`}>
          Request changes
        </button>
      </div>
    </div>
  );
}

export function ReportControls({ reportId, listingId, live }: { reportId: string; listingId: string | null; live: boolean }) {
  const [note, setNote] = useState("");
  const { pending, run } = useRun();
  return (
    <div className="flex flex-col gap-2">
      {live && listingId && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Reason for pausing (the owner sees it)"
            aria-label="Reason for pausing"
            className="h-10 min-w-0 flex-1 rounded-md bg-white px-3 text-footnote ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-clay"
          />
          <button type="button" disabled={pending} onClick={() => run(() => pauseAction(listingId, note))} className={`${btn} bg-ink text-white hover:bg-ink-2`}>
            Pause listing
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "resolved"))} className={`${btn} text-ink ring-1 ring-ink/15 hover:bg-surface`}>
          Mark resolved
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "dismissed"))} className={`${btn} text-ink-2 hover:bg-surface`}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
