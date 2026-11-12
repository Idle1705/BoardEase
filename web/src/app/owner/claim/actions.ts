"use server";

import { getCurrentUser } from "@/server/profiles";
import { getDiscoveryDb } from "@/server/discovery/db";
import { DiscoveryError, submitClaim } from "@/server/discovery/core";

export type ClaimState = { ok?: string; error?: string; fields?: { role: string; scope: string; docs: string[]; note: string } };

const DOCS = new Set(["title", "deed-or-contract", "tax-declaration", "management-agreement", "business-permit", "utility-bill"]);

export async function submitClaimAction(_: ClaimState, form: FormData): Promise<ClaimState> {
  const docs = form.getAll("doc").map(String).filter((d) => DOCS.has(d));
  // Returned with every refusal, so the form can show what the owner already entered
  const fields = { role: String(form.get("role") ?? "owner"), scope: String(form.get("scope") ?? ""), docs, note: String(form.get("note") ?? "") };
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first.", fields };
  const db = getDiscoveryDb();
  if (!db) return { error: "Claims are not open on this server yet.", fields };
  try {
    await submitClaim(db, { id: user.id, role: user.role }, {
      buildingId: String(form.get("buildingId") ?? ""),
      role: form.get("role") === "manager" ? "manager" : "owner",
      scope: String(form.get("scope") ?? ""),
      // File upload opens once photo/file storage is chosen; until then the owner declares which documents
      // they hold and a moderator asks for them before deciding.
      evidenceKeys: docs.map((d) => `declared:${d}`),
      evidenceNote: String(form.get("note") ?? "").slice(0, 1000) || undefined,
    });
    return { ok: "Claim sent. A moderator will ask you for the documents and reply within a few working days." };
  } catch (e) {
    if (e instanceof DiscoveryError) return { error: e.message, fields };
    return { error: "Couldn't send the claim. Try again.", fields };
  }
}
