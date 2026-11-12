import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import sharp from "sharp";
import { getDb, schema } from "@/server/db";
import { getCurrentUser } from "@/server/profiles";
import { addPhoto, MarketError } from "@/server/marketplace/core";
import { deletePhoto, photoUrl, putPhoto, storageConfigured } from "@/server/storage";

/*
 * Owner photo upload (docs/web/MARKETPLACE.md, "Photos").
 *  1. Signed-in owner (role read from our database), and the property must be theirs.
 *  2. Size limit, then the real file type from its first bytes (JPEG, PNG or WebP), not the name.
 *  3. Re-encoded by sharp: rotated upright, at most 2000 px, WebP. Re-encoding drops every piece of
 *     metadata (GPS position, camera serial, owner name) that phones put in photos.
 *  4. Stored under a random key; Postgres keeps only the key. If the database insert fails, the file
 *     is deleted again, so no orphaned uploads.
 * The browser also shrinks photos before upload, so requests stay under hosting body limits.
 * Route handlers run on Node.js by default, which sharp needs.
 */


const MAX_BYTES = 4 * 1024 * 1024;
const MIN_W = 600;
const MIN_H = 400;
const PER_HOUR = 60;

function sniff(b: Buffer): "jpeg" | "png" | "webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

const refuse = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return refuse("Sign in first.", 401);
  if (user.role !== "owner" && user.role !== "admin") return refuse("Only property owners can upload photos.", 403);
  if (!storageConfigured()) return refuse("Photo storage isn't set up yet.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refuse("Couldn't read the upload.");
  }
  const file = form.get("file");
  const propertyId = String(form.get("propertyId") ?? "");
  const roomId = String(form.get("roomId") ?? "") || null;
  const alt = String(form.get("alt") ?? "").trim().slice(0, 140);
  if (!(file instanceof File)) return refuse("Choose a photo.");
  if (!/^[0-9a-f-]{36}$/i.test(propertyId) || (roomId && !/^[0-9a-f-]{36}$/i.test(roomId))) return refuse("Unknown property.");
  if (file.size > MAX_BYTES) return refuse("That photo is too large. Use one under 4 MB.", 413);
  if (alt.length < 3) return refuse("Describe what the photo shows (for people using screen readers).");

  const db = getDb();
  // Ownership before anything is stored
  const [owned] = await db
    .select({ id: schema.properties.id })
    .from(schema.properties)
    .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.ownerId, user.id)))
    .limit(1);
  if (!owned) return refuse("Property not found.", 404);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.listingPhotos)
    .where(and(eq(schema.listingPhotos.ownerId, user.id), gte(schema.listingPhotos.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= PER_HOUR) return refuse("That's a lot of photos for one hour. Try again later.", 429);

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) return refuse("Use a JPEG, PNG or WebP photo.", 415);

  let out: { data: Buffer; info: { width: number; height: number } };
  try {
    out = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return refuse("That file isn't a photo we can read.", 415);
  }
  if (out.info.width < MIN_W || out.info.height < MIN_H) return refuse(`Use a photo at least ${MIN_W} × ${MIN_H} pixels.`);

  const key = `p/${propertyId}/${randomUUID()}.webp`;
  try {
    await putPhoto(key, out.data, "image/webp");
  } catch {
    return refuse("Couldn't store the photo. Try again.", 502);
  }
  try {
    const id = await addPhoto(db, { id: user.id, role: user.role }, propertyId, {
      key,
      width: out.info.width,
      height: out.info.height,
      bytes: out.data.length,
      alt,
      roomId,
    });
    return NextResponse.json({ id, url: photoUrl(key), width: out.info.width, height: out.info.height, alt });
  } catch (e) {
    await deletePhoto(key).catch(() => {});
    return refuse(e instanceof MarketError ? e.message : "Couldn't save the photo. Try again.", e instanceof MarketError ? 400 : 500);
  }
}
