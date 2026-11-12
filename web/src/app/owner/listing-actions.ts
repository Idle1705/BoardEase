"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AMENITIES, MIN_DESCRIPTION } from "@/lib/marketplace";
import { PROPERTY_TYPES } from "@/lib/listing-types";
import { getDb } from "@/server/db";
import { requireRole } from "@/server/profiles";
import {
  confirmAvailability,
  MarketError,
  ownerMove,
  removePhoto,
  saveListingDetails,
  setInquiryStatus,
  replyToInquiry,
  updateRoom,
} from "@/server/marketplace/core";
import { deletePhoto } from "@/server/storage";

/*
 * Owner listing actions. The owner id always comes from the server session (requireRole); the core
 * functions check that the property, room, photo or inquiry belongs to that owner.
 */

export type ActionState = { ok?: string; error?: string; fields?: Record<string, string | string[]> };

async function asOwner() {
  const u = await requireRole("owner", "admin");
  return { id: u.id, role: u.role } as const;
}

function failure(e: unknown, fields?: ActionState["fields"]): ActionState {
  if (e instanceof MarketError || (e instanceof Error && /Sign in|access/.test(e.message))) return { error: e.message, fields };
  console.error("[owner-listing]", e);
  return { error: "Something went wrong. Try again.", fields };
}

const refresh = (propertyId: string) => {
  revalidatePath(`/owner/properties/${propertyId}`);
  revalidatePath("/owner", "layout");
  revalidatePath("/find");
};

const detailsInput = z.object({
  title: z.string().trim().min(5, "Give the listing a title of at least 5 characters.").max(80, "Keep the title under 80 characters."),
  type: z.enum(PROPERTY_TYPES, { message: "Choose the kind of place." }),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters."),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
  furnished: z.boolean(),
  bathroom: z.enum(["private", "shared"]),
  utilitiesNote: z.string().trim().max(200, "Keep the utilities note under 200 characters."),
  minimumStayMonths: z.coerce.number().int().min(1, "Minimum stay is at least 1 month.").max(24, "Minimum stay is at most 24 months."),
  showPhone: z.boolean(),
});

export async function saveDetailsAction(propertyId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const fields = {
    title: String(form.get("title") ?? ""),
    type: String(form.get("type") ?? ""),
    description: String(form.get("description") ?? ""),
    amenities: form.getAll("amenities").map(String),
    furnished: form.get("furnished") ? "on" : "",
    bathroom: String(form.get("bathroom") ?? "shared"),
    utilitiesNote: String(form.get("utilitiesNote") ?? ""),
    minimumStayMonths: String(form.get("minimumStayMonths") ?? "1"),
    showPhone: form.get("showPhone") ? "on" : "",
  };
  const parsed = detailsInput.safeParse({ ...fields, furnished: !!fields.furnished, showPhone: !!fields.showPhone });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  try {
    await saveListingDetails(getDb(), await asOwner(), propertyId, parsed.data);
  } catch (e) {
    return failure(e, fields);
  }
  refresh(propertyId);
  const short = parsed.data.description.length < MIN_DESCRIPTION;
  return { ok: short ? `Saved as a draft. The description needs ${MIN_DESCRIPTION} characters before review.` : "Listing details saved.", fields };
}

export async function updateRoomAction(propertyId: string, roomId: string, change: { rent?: number; takenManual?: number }): Promise<ActionState> {
  try {
    await updateRoom(getDb(), await asOwner(), roomId, {
      rentCents: change.rent === undefined ? undefined : Math.round(change.rent * 100),
      takenManual: change.takenManual,
    });
  } catch (e) {
    return failure(e);
  }
  refresh(propertyId);
  return { ok: "Saved." };
}

export async function confirmAvailabilityAction(propertyId: string): Promise<ActionState> {
  try {
    await confirmAvailability(getDb(), await asOwner(), propertyId);
  } catch (e) {
    return failure(e);
  }
  refresh(propertyId);
  return { ok: "Availability confirmed for the next 30 days." };
}

const MOVE_OK = {
  submitted: "Sent for review. We'll check it and reply here.",
  draft: "Back to draft. Edit and send it again when ready.",
  published: "Your listing is live in the finder.",
  paused: "Paused. It's hidden from the finder until you publish it again.",
  archived: "Archived.",
} as const;

export async function moveListingAction(propertyId: string, to: keyof typeof MOVE_OK): Promise<ActionState> {
  if (!(to in MOVE_OK)) return { error: "Unknown step." };
  try {
    await ownerMove(getDb(), await asOwner(), propertyId, to);
  } catch (e) {
    return failure(e);
  }
  refresh(propertyId);
  return { ok: MOVE_OK[to] };
}

export async function removePhotoAction(propertyId: string, photoId: string): Promise<ActionState> {
  try {
    const key = await removePhoto(getDb(), await asOwner(), photoId);
    // The row is gone; remove the file too. A failed delete is logged for the orphan sweep, not shown.
    await deletePhoto(key).catch((e) => console.error("[photo-delete] orphan left:", key, e));
  } catch (e) {
    return failure(e);
  }
  refresh(propertyId);
  return { ok: "Photo removed." };
}

/* ---------- Owner inquiry inbox ---------- */

export async function ownerReplyAction(inquiryId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const body = String(form.get("body") ?? "");
  try {
    await replyToInquiry(getDb(), await asOwner(), inquiryId, body);
  } catch (e) {
    return failure(e, { body });
  }
  revalidatePath(`/owner/inquiries/${inquiryId}`);
  revalidatePath("/owner", "layout");
  return { ok: "Reply sent. The renter sees it in their BoardEase inquiries." };
}

export async function ownerInquiryStatusAction(inquiryId: string, status: "replied" | "viewing-set" | "closed"): Promise<ActionState> {
  try {
    await setInquiryStatus(getDb(), await asOwner(), inquiryId, status);
  } catch (e) {
    return failure(e);
  }
  revalidatePath(`/owner/inquiries/${inquiryId}`);
  revalidatePath("/owner", "layout");
  return { ok: "Status updated." };
}
