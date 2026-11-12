"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, CircleCheck, ExternalLink, ImagePlus, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AMENITIES, BASIS_LABEL, CONFIRM_DAYS, MAX_PHOTOS, MIN_DESCRIPTION, STATUS_LABEL, type ListingStatus } from "@/lib/marketplace";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  confirmAvailabilityAction,
  moveListingAction,
  removePhotoAction,
  saveDetailsAction,
  updateRoomAction,
  type ActionState,
} from "./listing-actions";

/*
 * The owner's listing editor (docs/web/MARKETPLACE.md). One property = one public listing.
 * Everything saves as a draft; going live needs the checklist, an admin review, then the owner's publish.
 */

const input =
  "w-full rounded-md bg-white px-3.5 text-body text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-clay";

function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-md bg-[#fbeceb] px-3 py-2.5 text-footnote text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="flex items-start gap-2 rounded-md bg-garden-soft px-3 py-2.5 text-footnote font-medium text-garden-ink">
        <CircleCheck className="mt-0.5 size-4 shrink-0" /> {state.ok}
      </p>
    );
  return null;
}

function Button({
  children,
  onClick,
  pending,
  tone = "clay",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  pending?: boolean;
  tone?: "clay" | "ink" | "quiet";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-body font-semibold transition-[background-color,scale,opacity] duration-150 active:scale-[0.97] disabled:opacity-60",
        tone === "clay" && "bg-clay text-white hover:bg-clay-hover",
        tone === "ink" && "bg-ink text-white hover:bg-ink-2",
        tone === "quiet" && "text-ink ring-1 ring-ink/15 hover:bg-surface",
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Publish panel */

export function PublishPanel({
  propertyId,
  listingId,
  status,
  reviewNote,
  checklist,
  confirmedDays,
  freeSpaces,
}: {
  propertyId: string;
  listingId: string | null;
  status: ListingStatus | null;
  reviewNote: string | null;
  checklist: { key: string; label: string; ok: boolean }[];
  /** Whole days since the owner last confirmed availability (computed on the server), or null. */
  confirmedDays: number | null;
  freeSpaces: number;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) => start(async () => setState(await fn()));
  const done = checklist.every((c) => c.ok);
  const st = status ?? "draft";
  const days = confirmedDays;
  const stale = days === null || days > CONFIRM_DAYS;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-7 items-center rounded-full px-3 text-footnote font-semibold",
            st === "published" ? "bg-garden-soft text-garden-ink" : st === "rejected" ? "bg-[#fbeceb] text-destructive" : "bg-limestone/70 text-ink",
          )}
        >
          {STATUS_LABEL[st]}
        </span>
        {listingId && (
          <Link href={`/listings/${listingId}`} className="inline-flex items-center gap-1 text-footnote font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            {st === "published" ? "View public page" : "Preview"} <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      {reviewNote && (st === "rejected" || st === "paused" || st === "approved") && (
        <p className="rounded-md bg-porcelain px-3 py-2.5 text-footnote text-ink-2">
          <span className="font-semibold text-ink">Note from BoardEase review: </span>
          {reviewNote}
        </p>
      )}

      {(st === "draft" || st === "rejected") && (
        <ul className="flex flex-col gap-2" aria-label="Before you can send for review">
          {checklist.map((c) => (
            <li key={c.key} className={cn("flex items-start gap-2.5 text-footnote", c.ok ? "text-ink-2" : "text-ink")}>
              <span className={cn("mt-px grid size-4.5 shrink-0 place-items-center rounded-full", c.ok ? "bg-garden text-white" : "ring-1 ring-ink/25")}>
                {c.ok && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={c.ok ? "line-through decoration-ink/25" : ""}>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {st === "submitted" && <p className="text-footnote text-ink-2">A BoardEase reviewer checks that the listing looks genuine and complete. You can keep editing while you wait.</p>}
      {st === "approved" && <p className="text-footnote text-ink-2">Approved. Publish when the rooms are ready for renters to ask about.</p>}

      {(st === "published" || st === "paused" || st === "approved") && (
        <div className={cn("rounded-md px-3 py-2.5 text-footnote", stale ? "bg-[#fdf6e7] text-warn" : "bg-porcelain text-ink-2")}>
          {days === null
            ? "Availability not confirmed yet."
            : stale
              ? `Availability last confirmed ${days} days ago. The listing is hidden from the finder until you confirm again.`
              : `Availability confirmed ${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}. Confirm again within ${CONFIRM_DAYS} days to stay in the finder.`}
          {st === "published" && freeSpaces === 0 && " All spaces are taken, so the listing isn't shown in the finder right now."}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(st === "draft" || st === "rejected") && (
          <Button pending={pending} disabled={!done} onClick={() => run(() => moveListingAction(propertyId, "submitted"))}>
            Send for review
          </Button>
        )}
        {st === "submitted" && (
          <Button tone="quiet" pending={pending} onClick={() => run(() => moveListingAction(propertyId, "draft"))}>
            Withdraw
          </Button>
        )}
        {(st === "approved" || st === "paused") && (
          <Button pending={pending} onClick={() => run(() => moveListingAction(propertyId, "published"))}>
            Publish now
          </Button>
        )}
        {(st === "published" || st === "paused") && (
          <Button tone="ink" pending={pending} onClick={() => run(() => confirmAvailabilityAction(propertyId))}>
            Availability is correct
          </Button>
        )}
        {st === "published" && (
          <Button tone="quiet" pending={pending} onClick={() => run(() => moveListingAction(propertyId, "paused"))}>
            Pause
          </Button>
        )}
      </div>
      {!done && (st === "draft" || st === "rejected") && <p className="text-caption text-subtle">Finish the checklist to send it for review. Everything you enter is saved as a draft.</p>}
      <div aria-live="polite">
        <Feedback state={state} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Details */

export type DetailsInitial = {
  title: string;
  type: string;
  description: string;
  amenities: string[];
  furnished: boolean;
  bathroom: string;
  utilitiesNote: string;
  minimumStayMonths: number;
  showPhone: boolean;
};

export function DetailsForm({ propertyId, initial, hasPhone }: { propertyId: string; initial: DetailsInitial; hasPhone: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDetailsAction.bind(null, propertyId), {});
  const f = (state.fields ?? {}) as Record<string, string | string[]>;
  const v = <K extends keyof DetailsInitial>(k: K) => (f[k] !== undefined ? f[k] : initial[k]);
  const [desc, setDesc] = useState(String(v("description")));
  const amen = new Set((f.amenities as string[] | undefined) ?? initial.amenities);
  return (
    <form action={action} key={JSON.stringify(state.fields ?? null)} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Listing title
          <input name="title" defaultValue={String(v("title"))} maxLength={80} required className={cn(input, "h-11")} />
        </label>
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Kind of place
          <select name="type" defaultValue={String(v("type"))} className={cn(input, "h-11")}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
        Description
        <textarea
          name="description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={5}
          maxLength={2000}
          className={cn(input, "py-2.5 leading-relaxed")}
          placeholder="What renters should know: the building, the rooms, house rules, what's nearby."
        />
        <span className={cn("font-normal", desc.trim().length >= MIN_DESCRIPTION ? "text-subtle" : "text-warn")}>
          {desc.trim().length} / {MIN_DESCRIPTION} characters minimum
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-footnote font-medium text-ink">Amenities</legend>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <label key={a} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-footnote text-ink ring-1 ring-ink/15 has-checked:bg-clay-soft has-checked:ring-clay/40">
              <input type="checkbox" name="amenities" value={a} defaultChecked={amen.has(a)} className="accent-[#b44630]" />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Bathroom
          <select name="bathroom" defaultValue={String(v("bathroom"))} className={cn(input, "h-11")}>
            <option value="shared">Shared</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
          Minimum stay (months)
          <input name="minimumStayMonths" type="number" min={1} max={24} defaultValue={String(v("minimumStayMonths"))} className={cn(input, "h-11")} />
        </label>
        <label className="flex items-center gap-2.5 self-end pb-3 text-body text-ink">
          <input type="checkbox" name="furnished" defaultChecked={v("furnished") === true || v("furnished") === "on"} className="size-4 accent-[#b44630]" />
          Furnished
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
        Utilities
        <input name="utilitiesNote" defaultValue={String(v("utilitiesNote"))} maxLength={200} placeholder="e.g. Water included, electricity by sub-meter" className={cn(input, "h-11")} />
      </label>
      <label className="flex items-start gap-2.5 text-body text-ink">
        <input type="checkbox" name="showPhone" defaultChecked={v("showPhone") === true || v("showPhone") === "on"} disabled={!hasPhone} className="mt-1 size-4 accent-[#b44630]" />
        <span>
          Show my phone number on the listing
          <span className="block text-footnote text-subtle">
            {hasPhone ? "Renters can always message you in BoardEase. Your number is shown only if you tick this." : "Add a phone number to your account to offer it. In-app messages always work."}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" pending={pending}>
          Save details
        </Button>
        <div aria-live="polite" className="min-w-0 flex-1">
          <Feedback state={state} />
        </div>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- Rooms: rent and availability */

export type EditorRoom = {
  id: string;
  label: string;
  kind: "single" | "shared" | "unit";
  capacity: number;
  rentCents: number;
  tenancies: number;
  takenManual: number;
  basis: "bed" | "room" | "unit";
  total: number;
  free: number;
};

function RoomRow({ propertyId, room }: { propertyId: string; room: EditorRoom }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rent, setRent] = useState(String(room.rentCents / 100));
  const save = (change: { rent?: number; takenManual?: number }, label: string) =>
    start(async () => {
      const r = await updateRoomAction(propertyId, room.id, change);
      if (r.error) toast.error(r.error);
      else {
        toast.success(label);
        router.refresh();
      }
    });
  const maxTaken = room.capacity - room.tenancies;
  const rentChanged = Number(rent) * 100 !== room.rentCents;
  return (
    <li className="grid gap-3 border-b border-limestone/70 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_200px_190px] sm:items-center" data-row-id={room.id}>
      <div>
        <p className="text-body font-semibold text-ink">{room.label}</p>
        <p className="text-footnote text-subtle">
          {room.kind === "shared" ? `Shared, ${room.capacity} beds` : room.kind === "unit" ? "Whole unit" : "Single room"} · rented {BASIS_LABEL[room.basis]}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ rent: Number(rent) }, `${room.label}: rent saved`);
        }}
        className="flex items-center gap-2"
      >
        <label className="sr-only" htmlFor={`rent-${room.id}`}>
          Monthly rent for {room.label}
        </label>
        <span className="text-footnote text-subtle">₱</span>
        <input
          id={`rent-${room.id}`}
          inputMode="numeric"
          value={rent}
          onChange={(e) => setRent(e.target.value.replace(/[^0-9.]/g, ""))}
          className={cn(input, "h-10 w-28 tabular-nums")}
        />
        <button type="submit" disabled={!rentChanged || pending} className="h-10 rounded-md px-3 text-footnote font-semibold text-clay hover:bg-clay-soft disabled:text-subtle disabled:hover:bg-transparent">
          Save
        </button>
      </form>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {room.kind === "shared" ? (
          <div className="flex items-center gap-2" role="group" aria-label={`Beds taken in ${room.label}`}>
            <button
              type="button"
              aria-label="One bed fewer taken"
              disabled={pending || room.takenManual <= 0}
              onClick={() => save({ takenManual: room.takenManual - 1 }, `${room.label}: a bed is free again`)}
              className="grid size-9 place-items-center rounded-full ring-1 ring-ink/15 hover:bg-surface disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[5.5rem] text-center text-footnote tabular-nums">
              <span className={cn("font-semibold", room.free > 0 ? "text-garden-ink" : "text-subtle")}>{room.free} free</span> of {room.total}
            </span>
            <button
              type="button"
              aria-label="One more bed taken"
              disabled={pending || room.takenManual >= maxTaken}
              onClick={() => save({ takenManual: room.takenManual + 1 }, `${room.label}: a bed is now taken`)}
              className="grid size-9 place-items-center rounded-full ring-1 ring-ink/15 hover:bg-surface disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : (
          <label className="inline-flex items-center gap-2.5 text-footnote font-medium text-ink">
            <input
              type="checkbox"
              checked={room.free > 0}
              disabled={pending || room.tenancies > 0}
              onChange={(e) => save({ takenManual: e.target.checked ? 0 : 1 }, `${room.label}: ${e.target.checked ? "available" : "taken"}`)}
              className="size-4 accent-[#497760]"
            />
            {room.free > 0 ? "Available" : "Taken"}
          </label>
        )}
      </div>
    </li>
  );
}

export function RoomsEditor({ propertyId, rooms }: { propertyId: string; rooms: EditorRoom[] }) {
  if (!rooms.length) return <p className="text-body text-ink-2">No rooms yet. Add each room below with its beds and monthly rent.</p>;
  return (
    <ul className="flex flex-col">
      {rooms.map((r) => (
        <RoomRow key={`${r.id}-${r.rentCents}-${r.takenManual}`} propertyId={propertyId} room={r} />
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Photos */

/**
 * Shrinks a photo in the browser before upload (max 2400 px, JPEG). Redrawing on a canvas also drops
 * the file's metadata (GPS, camera). The server re-checks and re-encodes regardless.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
}

export type EditorPhoto = { id: string; url: string; alt: string; width: number; height: number; roomId: string | null };

export function PhotoManager({ propertyId, photos, rooms }: { propertyId: string; photos: EditorPhoto[]; rooms: { id: string; label: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();
  const full = photos.length >= MAX_PHOTOS;

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Choose a photo first.");
    if (alt.trim().length < 3) return setError("Describe what the photo shows.");
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        return setError("This browser couldn't open that file. Use a JPEG, PNG or WebP photo.");
      }
      const body = new FormData();
      body.set("file", blob, "photo.jpg");
      body.set("propertyId", propertyId);
      body.set("alt", alt.trim());
      if (roomId) body.set("roomId", roomId);
      const res = await fetch("/api/owner/photos", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(json.error ?? "Upload failed. Try again.");
      toast.success("Photo added.");
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-lg bg-limestone">
              <div className="relative aspect-[4/3]">
                <Image src={p.url} alt={p.alt} fill sizes="(min-width: 640px) 240px, 45vw" className="object-cover" />
              </div>
              <p className="truncate px-2.5 py-2 text-caption text-ink-2" title={p.alt}>
                {p.roomId ? `${rooms.find((r) => r.id === p.roomId)?.label ?? "Room"} · ` : ""}
                {p.alt}
              </p>
              <button
                type="button"
                aria-label={`Remove photo: ${p.alt}`}
                disabled={removing}
                onClick={() =>
                  startRemove(async () => {
                    const r = await removePhotoAction(propertyId, p.id);
                    if (r.error) toast.error(r.error);
                    else {
                      toast.success("Photo removed.");
                      router.refresh();
                    }
                  })
                }
                className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-md hover:bg-white"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-2">No photos yet. Add at least two: the building or entrance, and a room.</p>
      )}

      {!full && (
        <form onSubmit={upload} className="flex flex-col gap-3 rounded-lg bg-porcelain p-4">
          <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
            Photo
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-footnote file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-white file:px-3 file:font-semibold file:text-ink file:ring-1 file:ring-ink/15" />
          </label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
              What it shows
              <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={140} placeholder="e.g. Room A, three beds by the window" className={cn(input, "h-10")} />
            </label>
            <label className="flex flex-col gap-1.5 text-footnote font-medium text-ink">
              Room (optional)
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={cn(input, "h-10")}>
                <option value="">Whole property</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-caption text-subtle">
            Only photos you took or have permission to use. No photos from Google Maps, Facebook or other listings. We remove location data from every photo.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" pending={busy}>
              <ImagePlus className="size-4" /> Upload photo
            </Button>
            {error && (
              <p role="alert" className="text-footnote text-destructive">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
      <p className="text-caption text-subtle">
        {photos.length} of {MAX_PHOTOS} photos
      </p>
    </div>
  );
}

export function RoomPriceSummary({ rooms }: { rooms: EditorRoom[] }) {
  const open = rooms.filter((r) => r.free > 0);
  if (!open.length) return null;
  return <span className="text-footnote text-ink-2">From {formatPeso(Math.min(...open.map((r) => r.rentCents)) / 100)} a month</span>;
}
