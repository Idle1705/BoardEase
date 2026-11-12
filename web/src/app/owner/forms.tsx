"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { createPropertyAction, createRoomAction, type FormState } from "./actions";
import { cn } from "@/lib/utils";

const input =
  "h-11 w-full rounded-md bg-white px-3.5 text-body text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-clay";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
      {label}
      {children}
      {hint && <span className="font-normal text-subtle">{hint}</span>}
    </label>
  );
}

/** Success and error feedback. Animation never hides a failure: errors stay until the next submit. */
function Status({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-md bg-[#fbeceb] px-3 py-2.5 text-footnote text-destructive">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="be-enter flex items-center gap-2 rounded-md bg-garden-soft px-3 py-2.5 text-footnote font-medium text-garden-ink" style={{ ["--rise" as string]: "4px" }}>
        <CircleCheck className="size-4" /> {state.ok}
      </p>
    );
  return null;
}

/**
 * Both labels sit in the same grid cell, so the button keeps its width while saving.
 * Saving a property looks the street up on the map first, which can take a few seconds.
 */
function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-grid h-11 place-items-center rounded-md bg-clay px-5 text-body font-semibold text-white transition-[background-color,scale,opacity] duration-150 hover:bg-clay-hover active:scale-[0.97] disabled:opacity-75"
    >
      <span className={cn("col-start-1 row-start-1 transition-opacity duration-150", pending && "opacity-0")}>{children}</span>
      <span aria-hidden={!pending} className={cn("col-start-1 row-start-1 inline-flex items-center gap-2 transition-opacity duration-150", !pending && "opacity-0")}>
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Saving
      </span>
    </button>
  );
}

/**
 * After the server confirms a save, bring the new row into view and give it a short Fired Clay wash,
 * so the owner sees where it went. Runs only on a confirmed id; a failed save never highlights anything.
 */
function useHighlightNewRow(newId: string | undefined) {
  useEffect(() => {
    if (!newId) return;
    let frames = 0;
    let raf = 0;
    const find = () => {
      const row = document.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(newId)}"]`);
      if (row) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        row.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
        row.animate(
          reduce
            ? [{ backgroundColor: "rgb(180 70 48 / 0.14)" }, { backgroundColor: "rgb(180 70 48 / 0)" }]
            : [
                { backgroundColor: "rgb(180 70 48 / 0.16)", opacity: 0, translate: "0 6px" },
                { backgroundColor: "rgb(180 70 48 / 0.14)", opacity: 1, translate: "0 0", offset: 0.25 },
                { backgroundColor: "rgb(180 70 48 / 0)", opacity: 1, translate: "0 0" },
              ],
          { duration: reduce ? 1200 : 1400, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
        return;
      }
      // The list re-renders from the server right after the action; wait for it (about 2 s at most)
      if (++frames < 120) raf = requestAnimationFrame(find);
    };
    raf = requestAnimationFrame(find);
    return () => cancelAnimationFrame(raf);
  }, [newId]);
}

export function PropertyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createPropertyAction, {});
  const form = useRef<HTMLFormElement>(null);
  useHighlightNewRow(state.newId);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  const f = state.fields ?? {};
  return (
    <form ref={form} action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Property name" hint="What you call it, e.g. Santos Boarding House">
        <input name="name" required maxLength={80} defaultValue={f.name} className={input} autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Street" hint="No house number. Renters only see the area.">
          <input name="street" required maxLength={120} defaultValue={f.street} className={input} autoComplete="off" />
        </Field>
        <Field label="Barangay or district">
          <input name="district" required maxLength={80} defaultValue={f.district} className={input} autoComplete="off" />
        </Field>
      </div>
      <Field label="City">
        <input name="city" required maxLength={60} defaultValue={f.city ?? "Davao City"} className={input} autoComplete="address-level2" />
      </Field>
      <Status state={state} />
      <div>
        <Submit pending={pending}>Add property</Submit>
      </div>
    </form>
  );
}

export function RoomForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRoomAction, {});
  const form = useRef<HTMLFormElement>(null);
  useHighlightNewRow(state.newId);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      {/* Remounted after each saved room, so the type choice starts fresh */}
      <RoomFields key={state.ok ?? "edit"} fields={state.ok ? {} : (state.fields ?? {})} />
      <Status state={state} />
      <div>
        <Submit pending={pending}>Add room</Submit>
      </div>
    </form>
  );
}

function RoomFields({ fields: f }: { fields: Record<string, string> }) {
  const highlightId = useId();
  const [kind, setKind] = useState<"single" | "shared" | "unit">(
    f.kind === "shared" || f.kind === "unit" ? f.kind : "single",
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room name or number">
          <input name="label" required maxLength={30} defaultValue={f.label} className={input} autoComplete="off" placeholder="Room 1…" />
        </Field>
        <Field label="Monthly rent (₱)" hint={kind === "unit" ? "For the whole unit" : kind === "shared" ? "Per bed" : "For the room"}>
          <input name="rent" required inputMode="decimal" defaultValue={f.rent} className={cn(input, "tabular-nums")} autoComplete="off" placeholder="3500" />
        </Field>
      </div>
      <MotionConfig reducedMotion="user">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-footnote font-medium text-ink">How is it rented?</legend>
        {/* isolate: the sliding highlight (-z-10) stays above this group and below every card's text */}
        <div className="isolate flex flex-col gap-2">
          {(
            [
              ["single", "Single room", "1 bed, one tenant"],
              ["shared", "Shared room", "2 or 3 beds, rented per bed"],
              ["unit", "Whole unit", "Apartment or studio"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-3 ring-1 transition-[background-color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                kind === value ? "ring-transparent" : "ring-ink/15 hover:bg-ink/[0.03]",
              )}
            >
              {/* One highlight slides to the chosen option (Motion layout animation) */}
              {kind === value && (
                <motion.span
                  layoutId={highlightId}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-lg bg-clay-soft ring-1 ring-clay/50"
                  transition={{ type: "spring", duration: 0.32, bounce: 0 }}
                />
              )}
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="size-4 shrink-0 accent-clay" />
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-body font-medium text-ink">{label}</span>
                <span className="text-footnote text-subtle">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      </MotionConfig>
      <Field label="Beds (rentable spaces)">
        {kind === "single" ? (
          <input name="capacity" value="1" readOnly className={cn(input, "bg-surface")} />
        ) : (
          <input
            key={kind}
            name="capacity"
            type="number"
            required
            min={kind === "shared" ? 2 : 1}
            max={kind === "shared" ? 3 : 40}
            defaultValue={f.capacity ?? (kind === "shared" ? "2" : "1")}
            className={cn(input, "tabular-nums")}
          />
        )}
      </Field>
    </>
  );
}
