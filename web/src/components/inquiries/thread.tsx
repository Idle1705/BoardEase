"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* Shared by the owner inbox and the renter's inquiries: the conversation and a reply box. */

export type ThreadMessage = { id: string; body: string; mine: boolean; author: string; at: string };

export function Messages({ opening, messages }: { opening: ThreadMessage; messages: ThreadMessage[] }) {
  return (
    <ol className="flex flex-col gap-3" aria-label="Messages">
      {[opening, ...messages].map((m) => (
        <li key={m.id} className={cn("flex flex-col gap-1", m.mine ? "items-end" : "items-start")}>
          <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-body whitespace-pre-wrap", m.mine ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white text-ink ring-1 ring-ink/8")}>
            {m.body}
          </div>
          <p className="px-1 text-caption text-subtle">
            {m.author} · {m.at}
          </p>
        </li>
      ))}
    </ol>
  );
}

type Result = { ok?: string; error?: string; fields?: Record<string, string | string[]> };

export function ReplyBox({ action, placeholder }: { action: (s: Result, f: FormData) => Promise<Result>; placeholder: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} key={state.ok ?? "draft"} className="flex flex-col gap-2">
      <label htmlFor="reply" className="sr-only">
        Your reply
      </label>
      <textarea
        id="reply"
        name="body"
        rows={3}
        maxLength={1000}
        required
        defaultValue={state.error ? String(state.fields?.body ?? "") : ""}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white px-4 py-3 text-body text-ink ring-1 ring-ink/15 outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-clay"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-footnote">
          {state.error && (
            <span role="alert" className="inline-flex items-center gap-1.5 text-destructive">
              <CircleAlert className="size-4" /> {state.error}
            </span>
          )}
          {state.ok && <span className="text-garden-ink">{state.ok}</span>}
        </div>
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white hover:bg-clay-hover disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />} Send
        </button>
      </div>
    </form>
  );
}

export function StatusButtons({
  options,
  onSet,
}: {
  options: { value: string; label: string; current: boolean }[];
  onSet: (value: string) => Promise<{ ok?: string; error?: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Inquiry status">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.current}
          disabled={pending || o.current}
          onClick={() =>
            start(async () => {
              const r = await onSet(o.value);
              if (r.error) toast.error(r.error);
              else {
                toast.success(r.ok ?? "Updated.");
                router.refresh();
              }
            })
          }
          className={cn(
            "inline-flex h-9 items-center rounded-full px-3.5 text-footnote font-semibold ring-1 transition-colors",
            o.current ? "bg-ink text-white ring-ink" : "text-ink ring-ink/15 hover:bg-surface",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SharedPhone({ phone }: { phone: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-md bg-garden-soft px-3 py-2 text-footnote text-garden-ink">
      <Phone className="size-4" /> The renter shared their number with you: <a className="font-semibold underline" href={`tel:${phone}`}>{phone.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3")}</a>
    </p>
  );
}
