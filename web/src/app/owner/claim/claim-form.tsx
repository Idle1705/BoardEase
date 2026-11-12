"use client";

import { useActionState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { submitClaimAction, type ClaimState } from "./actions";

const DOCS: [string, string][] = [
  ["title", "Land title or condominium certificate of title (TCT / CCT)"],
  ["deed-or-contract", "Deed of sale or contract to sell"],
  ["tax-declaration", "Real property tax declaration"],
  ["management-agreement", "Management or leasing agreement (for managers)"],
  ["business-permit", "Business permit for the boarding house or dormitory"],
  ["utility-bill", "Utility bill in your name at this address"],
];

export function ClaimForm({ buildingId }: { buildingId: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaimAction, {});
  if (state.ok)
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg bg-garden-soft px-4 py-3 text-body text-garden-ink">
        <CircleCheck className="mt-0.5 size-4 shrink-0" /> {state.ok}
      </p>
    );
  const v = state.fields;
  return (
    // Re-mounted after each refusal with what the owner entered (React resets a submitted form)
    <form key={JSON.stringify(v ?? {})} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="buildingId" value={buildingId} />
      <fieldset className="flex gap-2">
        <legend className="mb-2 text-footnote font-medium text-ink">You are the</legend>
        {(["owner", "manager"] as const).map((r) => (
          <label key={r} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-3.5 text-body ring-1 ring-ink/15 has-[:checked]:bg-clay-soft has-[:checked]:ring-clay/50">
            <input type="radio" name="role" value={r} defaultChecked={(v?.role ?? "owner") === r} className="accent-clay" />
            {r === "owner" ? "Owner" : "Authorised manager"}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
        What you own or manage
        <input name="scope" required maxLength={120} defaultValue={v?.scope} placeholder="Whole building, or e.g. Unit 1204, Tower 1" className="h-11 rounded-md bg-white px-3.5 text-body ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-clay" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-footnote font-medium text-ink">Documents you can show (at least one)</legend>
        {DOCS.map(([val, l]) => (
          <label key={val} className="flex items-start gap-2.5 text-body text-ink-2">
            <input type="checkbox" name="doc" value={val} defaultChecked={v?.docs.includes(val)} className="mt-1 size-4 accent-clay" />
            {l}
          </label>
        ))}
        <p className="text-footnote text-subtle">A moderator will ask you to send them privately. An email address or knowing the address is not enough on its own.</p>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
        Anything the moderator should know (optional)
        <textarea name="note" rows={3} maxLength={1000} defaultValue={v?.note} className="rounded-md bg-white px-3.5 py-2.5 text-body ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-clay" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-[#fbeceb] px-3 py-2.5 text-footnote text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} aria-busy={pending || undefined} className="inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale] hover:bg-clay-hover active:scale-[0.97] disabled:opacity-70">
          {pending && <Loader2 className="size-4 animate-spin" />} Send claim for review
        </button>
      </div>
    </form>
  );
}
