// [TEST] records for the discovery prototype, on the Neon DEV branch only.
//   node --env-file=.env.local scripts/seed-discovery-fixtures.mjs          add
//   node --env-file=.env.local scripts/seed-discovery-fixtures.mjs --remove remove
// Every title starts with "[TEST]" and every advert URL is on example.test, so nothing here can be
// mistaken for a real room. Prices are fixture values, not observations of the market.
import { neon } from "@neondatabase/serverless";

const url = process.env.DISCOVERY_DATABASE_URL;
if (!url) throw new Error("DISCOVERY_DATABASE_URL is not set");
if (url === process.env.DATABASE_URL) throw new Error("Refusing to write fixtures into the main database");
const sql = neon(url);
const OWNER = "fixture-owner";

if (process.argv.includes("--remove")) {
  await sql`delete from availability_checks where listing_id in (select id from listings where owner_id = ${OWNER})`;
  await sql`delete from listings where owner_id = ${OWNER}`;
  await sql`delete from rooms where owner_id = ${OWNER}`;
  await sql`delete from properties where owner_id = ${OWNER}`;
  await sql`delete from external_listings where submitted_by = ${OWNER}`;
  await sql`delete from profiles where user_id = ${OWNER}`;
  console.log("fixtures removed");
  process.exit(0);
}

await sql`insert into profiles (user_id, role, display_name) values (${OWNER}, 'owner', '[TEST] Fixture owner') on conflict do nothing`;
const [src] = await sql`
  insert into sources (key, name, kind, basis, licence, attribution)
  values ('advertiser-submitted', 'Submitted by the advertiser', 'advertiser_submitted', 'advertiser_consent', 'BoardEase submission terms (draft)', 'Submitted by the advertiser')
  on conflict (key) do update set name = excluded.name returning id`;

// A first-party listing near UM Matina, confirmed from tenancy records
const [p] = await sql`
  insert into properties (owner_id, name, street, district, public_lat, public_lng)
  values (${OWNER}, '[TEST] Fixture boarding house', 'MacArthur Highway', 'Matina', 7.0662, 125.5961) returning id`;
const [r] = await sql`insert into rooms (property_id, owner_id, label, kind, capacity, base_rent_cents) values (${p.id}, ${OWNER}, 'R1', 'shared', 3, 270000) returning id`;
const [l] = await sql`
  insert into listings (room_id, owner_id, title, description, type, monthly_price_cents, bathroom, furnished, rental_term, status, moderation, published_at)
  values (${r.id}, ${OWNER}, '[TEST] Bedspace in a room for three', 'Fixture listing for the prototype.', 'bedspace', 270000, 'shared', true, 'monthly', 'published', 'approved', now()) returning id`;
await sql`insert into availability_checks (listing_id, result, free_beds, method) values (${l.id}, 'available', 1, 'tenancy_records')`;

// Advertiser-submitted references at two real directory buildings (looked up by name), one current, one stale
const [verdon] = await sql`select id, lat, lng from buildings where name = 'Verdon Parc' limit 1`;
const [abreeza] = await sql`select id, lat, lng from buildings where name ilike 'Avida Towers Abreeza' limit 1`;
const day = 86_400_000;
const refs = [
  [verdon, "[TEST] 1-bedroom unit, advertised by its owner", "condominium", 1, 1800000, "Ecoland", "https://example.test/verdon-1br", 2, 12],
  [abreeza, "[TEST] Studio, advertised by its owner", "condominium", 0, null, "Bajada", "https://example.test/abreeza-studio", 20, -6],
];
for (const [b, title, type, br, price, district, link, checkedDaysAgo, expiresInDays] of refs) {
  if (!b) continue;
  await sql`
    insert into external_listings (source_id, building_id, normalized_url, url, title, property_type, rental_term, advertised_price_cents, bedrooms, furnished, district, submitted_by, status, last_checked_at, expires_at)
    values (${src.id}, ${b.id}, ${link}, ${link}, ${title}, ${type}, 'monthly', ${price}, ${br}, true, ${district}, ${OWNER},
            ${expiresInDays < 0 ? "stale" : "published"}, ${new Date(Date.now() - checkedDaysAgo * day).toISOString()}, ${new Date(Date.now() + expiresInDays * day).toISOString()})
    on conflict (normalized_url) do nothing`;
}
console.log("fixtures added (all titled [TEST]); remove with --remove");
