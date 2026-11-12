"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { requireRole } from "@/server/profiles";
import { adminPause, MarketError, resolveReport, reviewListing } from "@/server/marketplace/core";

/* Admin-only. requireRole reads the role from our database; owners and renters are refused. */

export type AdminResult = { ok?: string; error?: string };

async function admin() {
  const u = await requireRole("admin");
  return { id: u.id, role: u.role } as const;
}

const done = (ok: string): AdminResult => {
  revalidatePath("/admin");
  revalidatePath("/find");
  return { ok };
};

const failed = (e: unknown): AdminResult => (e instanceof MarketError || e instanceof Error ? { error: e.message } : { error: "Something went wrong." });

export async function reviewAction(listingId: string, decision: "approved" | "rejected", note: string): Promise<AdminResult> {
  try {
    await reviewListing(getDb(), await admin(), listingId, decision, note);
    return done(decision === "approved" ? "Approved. The owner can publish it now." : "Sent back to the owner with your note.");
  } catch (e) {
    return failed(e);
  }
}

export async function pauseAction(listingId: string, note: string): Promise<AdminResult> {
  try {
    await adminPause(getDb(), await admin(), listingId, note);
    return done("Listing paused. The owner sees your note.");
  } catch (e) {
    return failed(e);
  }
}

export async function resolveReportAction(reportId: string, status: "resolved" | "dismissed"): Promise<AdminResult> {
  try {
    await resolveReport(getDb(), await admin(), reportId, status);
    return done(status === "resolved" ? "Report resolved." : "Report dismissed.");
  } catch (e) {
    return failed(e);
  }
}
