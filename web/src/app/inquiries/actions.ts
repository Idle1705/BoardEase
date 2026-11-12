"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizePhMobile } from "@/lib/marketplace";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { createInquiry, createReport, MarketError, REPORT_REASONS, replyToInquiry, setInquiryStatus } from "@/server/marketplace/core";

/*
 * Renter-side actions. The renter id always comes from the server session. Messages stay inside
 * BoardEase: nothing here claims an email or SMS was sent, because none is (no provider configured).
 */

export type FormResult = { ok?: string; error?: string; fields?: Record<string, string | string[]>; inquiryId?: string };

async function actor() {
  const u = await getCurrentUser();
  if (!u) return null;
  return { id: u.id, role: u.role } as const;
}

const known = (e: unknown, fields?: Record<string, string>): FormResult => {
  if (e instanceof MarketError) return { error: e.message, fields };
  console.error("[inquiry]", e);
  return { error: "Something went wrong. Try again.", fields };
};

const inquiryInput = z.object({
  kind: z.enum(["question", "viewing"]),
  message: z.string(),
  preferredDate: z.string().optional(),
  roomId: z.string().uuid().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function sendInquiryAction(listingId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const fields = {
    kind: String(form.get("kind") ?? "question"),
    message: String(form.get("message") ?? ""),
    preferredDate: String(form.get("preferredDate") ?? ""),
    roomId: String(form.get("roomId") ?? ""),
    phone: String(form.get("phone") ?? ""),
    sharePhone: form.get("sharePhone") ? "on" : "",
  };
  const a = await actor();
  if (!a) redirect(`/sign-in?next=${encodeURIComponent(`/listings/${listingId}`)}`);
  const parsed = inquiryInput.safeParse(fields);
  if (!parsed.success) return { error: "Check the form and try again.", fields };
  let phone: string | null = null;
  if (fields.sharePhone) {
    phone = normalizePhMobile(fields.phone);
    if (!phone) return { error: "Enter a mobile number like 0917 123 4567, or untick sharing it.", fields };
  }
  try {
    const id = await createInquiry(getDb(), a, listingId, {
      kind: parsed.data.kind,
      message: parsed.data.message,
      preferredDate: parsed.data.preferredDate || null,
      roomId: parsed.data.roomId || null,
      phone,
    });
    revalidatePath("/inquiries");
    return { ok: "Sent. The owner sees it in their BoardEase inbox; replies appear in your inquiries.", inquiryId: id };
  } catch (e) {
    return known(e, fields);
  }
}

export async function renterReplyAction(inquiryId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const body = String(form.get("body") ?? "");
  const a = await actor();
  if (!a) redirect(`/sign-in?next=${encodeURIComponent(`/inquiries/${inquiryId}`)}`);
  try {
    await replyToInquiry(getDb(), a, inquiryId, body);
  } catch (e) {
    return known(e, { body });
  }
  revalidatePath(`/inquiries/${inquiryId}`);
  return { ok: "Sent." };
}

export async function renterCloseAction(inquiryId: string): Promise<FormResult> {
  const a = await actor();
  if (!a) return { error: "Sign in first." };
  try {
    await setInquiryStatus(getDb(), a, inquiryId, "closed");
  } catch (e) {
    return known(e);
  }
  revalidatePath(`/inquiries/${inquiryId}`);
  revalidatePath("/inquiries");
  return { ok: "Inquiry closed." };
}

export async function reportAction(listingId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const fields = { reason: String(form.get("reason") ?? ""), details: String(form.get("details") ?? "") };
  const a = await actor();
  if (!a) redirect(`/sign-in?next=${encodeURIComponent(`/listings/${listingId}`)}`);
  if (!(fields.reason in REPORT_REASONS)) return { error: "Choose a reason.", fields };
  try {
    await createReport(getDb(), a, listingId, fields.reason as keyof typeof REPORT_REASONS, fields.details);
  } catch (e) {
    return known(e, fields);
  }
  return { ok: "Thanks. A BoardEase reviewer will look at this listing." };
}
