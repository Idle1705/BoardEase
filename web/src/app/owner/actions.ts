"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/server/db";
import { requireRole } from "@/server/profiles";
import { locateStreet, ownsProperty } from "@/server/owner";

/** `newId` is set only after the database confirmed the insert; the form highlights that row. */
export type FormState = { ok?: string; error?: string; newId?: string; fields?: Record<string, string> };

const text = (max: number, label: string) =>
  z.string().trim().min(1, `Enter the ${label}.`).max(max, `Keep the ${label} under ${max} characters.`);

const propertyInput = z.object({
  name: text(80, "property name"),
  street: text(120, "street"),
  district: text(80, "barangay or district"),
  city: text(60, "city"),
});

export async function createPropertyAction(_: FormState, form: FormData): Promise<FormState> {
  const fields = Object.fromEntries(["name", "street", "district", "city"].map((k) => [k, String(form.get(k) ?? "")]));
  let owner;
  try {
    owner = await requireRole("owner", "admin");
  } catch (e) {
    return { error: (e as Error).message, fields };
  }
  const parsed = propertyInput.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { name, street, district, city } = parsed.data;

  let point;
  try {
    point = await locateStreet(street, district, city);
  } catch {
    return { error: "The map search isn't responding. Try again in a minute.", fields };
  }
  if (!point) return { error: "We couldn't find that street. Check the spelling, or try a nearby main road.", fields };

  const [created] = await getDb()
    .insert(schema.properties)
    .values({ ownerId: owner.id, name, street, district, city, ...point })
    .returning({ id: schema.properties.id });
  revalidatePath("/owner", "layout");
  return { ok: `${name} added. Now add its rooms.`, newId: created?.id };
}

const roomInput = z
  .object({
    propertyId: z.string().uuid(),
    label: text(30, "room name"),
    kind: z.enum(["single", "shared", "unit"]),
    capacity: z.coerce.number().int().min(1, "A room needs at least one bed.").max(40),
    rent: z.coerce.number().positive("Enter the monthly rent.").max(500000),
  })
  // Same rules as the database checks (and the original desktop app)
  .refine((r) => r.kind !== "single" || r.capacity === 1, { message: "A single room has exactly one bed.", path: ["capacity"] })
  .refine((r) => r.kind !== "shared" || (r.capacity >= 2 && r.capacity <= 3), {
    message: "A shared room has 2 or 3 beds.",
    path: ["capacity"],
  });

export async function createRoomAction(_: FormState, form: FormData): Promise<FormState> {
  const fields = Object.fromEntries(["propertyId", "label", "kind", "capacity", "rent"].map((k) => [k, String(form.get(k) ?? "")]));
  let owner;
  try {
    owner = await requireRole("owner", "admin");
  } catch (e) {
    return { error: (e as Error).message, fields };
  }
  const parsed = roomInput.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const r = parsed.data;
  // Authorization: the property must belong to this owner
  if (!(await ownsProperty(owner.id, r.propertyId))) return { error: "You don't have access to this property.", fields };

  let roomId: string | undefined;
  try {
    const [created] = await getDb()
      .insert(schema.rooms)
      .values({
        propertyId: r.propertyId,
        ownerId: owner.id,
        label: r.label,
        kind: r.kind,
        capacity: r.capacity,
        baseRentCents: Math.round(r.rent * 100),
      })
      .returning({ id: schema.rooms.id });
    roomId = created?.id;
  } catch (e) {
    // Drizzle wraps the Postgres error; the code and constraint name sit on `cause`
    const pg = ((e as { cause?: { code?: string; constraint?: string } }).cause ?? e) as { code?: string; constraint?: string; message?: string };
    if (pg.code === "23505" || pg.constraint === "rooms_property_label_uq" || String(pg.message).includes("rooms_property_label_uq"))
      return { error: `There is already a room called "${r.label}" here.`, fields };
    return { error: "Couldn't save the room. Try again.", fields };
  }
  revalidatePath("/owner", "layout");
  return { ok: `${r.label} added.`, newId: roomId };
}
