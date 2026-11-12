// Seed the property DIRECTORY for the Davao pilot from OpenStreetMap (ODbL), into the discovery DEV branch.
//
//   node --env-file=.env.local scripts/import-osm-directory.mjs [--dry-run] [--from-file a.json,b.json]
//   --from-file imports saved Overpass JSON responses (e.g. when the public servers are busy, or from an own extract)
//
// - One Overpass request (light use per https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).
// - Writes ONLY to DISCOVERY_DATABASE_URL and refuses to run if that equals DATABASE_URL (main).
// - Every building is `unverified` until a moderator reviews it. Buildings are never rentable results.
// - Re-running is safe: (source, external_ref) is unique, so nothing duplicates; names and points refresh.
// - OSM data: (c) OpenStreetMap contributors, ODbL 1.0. Attribution is stored on the source row and shown in the UI.
import { neon } from "@neondatabase/serverless";

const DRY = process.argv.includes("--dry-run");
const url = process.env.DISCOVERY_DATABASE_URL;
if (!url) throw new Error("DISCOVERY_DATABASE_URL is not set");
if (url === process.env.DATABASE_URL) throw new Error("Refusing to import into the main database");

// Pilot areas: Matina, Ecoland, Poblacion, Bajada, Lanang (one box covering all five)
const BOX = [7.03, 125.565, 7.115, 125.65];
const AREAS = [
  ["Matina", 7.064, 125.594],
  ["Ecoland", 7.05, 125.589],
  ["Poblacion", 7.068, 125.611],
  ["Bajada", 7.086, 125.614],
  ["Lanang", 7.1, 125.633],
];
const RESIDENTIAL_NAME = /(dorm|dormitel|boarding|bedspace|apartment|residen|condo|tower|place|pad|homes|village|suites)/i;
const NOT_RESIDENTIAL_NAME = /(hotel|inn\b|resort|clinic|hospital|office|mall|cinema|restaurant|dialysis|business park|corporate)/i;

// Four small queries instead of one large one: busy public servers turn heavy requests away first
const CLAUSES = [
  `nwr["building"~"^(apartments|dormitory|residential)$"]["name"](${BOX});`,
  `nwr["amenity"="dormitory"]["name"](${BOX});`,
  `nwr["landuse"="residential"]["residential"="apartments"]["name"](${BOX});`,
  `nwr["tourism"~"^(apartment|guest_house|hostel)$"]["name"](${BOX});`,
];

function kindOf(t) {
  const n = t.name ?? "";
  if (/dorm/i.test(n) || t.amenity === "dormitory" || t.building === "dormitory") return "dormitory";
  if (/boarding|bedspace/i.test(n)) return "boarding_house";
  if (/condo|tower/i.test(n) || (t["building:levels"] && Number(t["building:levels"]) >= 10)) return "condominium";
  if (t.building === "apartments" || t.residential === "apartments" || t.tourism === "apartment" || /apartment|residen|place|suites/i.test(n)) return "apartment_building";
  return "other";
}
function nearestArea(lat, lng) {
  let best = AREAS[0], d = Infinity;
  for (const a of AREAS) {
    const dd = (a[1] - lat) ** 2 + ((a[2] - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (dd < d) { d = dd; best = a; }
  }
  return best[0];
}

// Public instances are listed at https://wiki.openstreetmap.org/wiki/Overpass_API (pick one that is up)
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function overpass(clause) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "BoardEase-directory-import/0.1 (pilot, manual run)" },
      body: "data=" + encodeURIComponent(`[out:json][timeout:60];(${clause});out tags center;`),
    });
    if (res.ok) return (await res.json()).elements;
    if (res.status !== 502 && res.status !== 429 && res.status !== 504) throw new Error(`Overpass answered ${res.status}`);
    await pause(15000 * attempt); // back off, as the usage policy asks
  }
  throw new Error("Overpass stayed busy; try again later or set OVERPASS_URL to another public instance");
}
const seen = new Set();
const elements = [];
const fileArg = process.argv[process.argv.indexOf("--from-file") + 1];
const files = process.argv.includes("--from-file") ? fileArg.split(",") : [];
const { readFileSync } = await import("node:fs");
for (const f of files) {
  for (const e of JSON.parse(readFileSync(f, "utf8")).elements) {
    const k = e.type + e.id;
    if (!seen.has(k)) { seen.add(k); elements.push(e); }
  }
}
for (const clause of files.length ? [] : CLAUSES) {
  for (const e of await overpass(clause)) {
    const k = e.type + e.id;
    if (!seen.has(k)) { seen.add(k); elements.push(e); }
  }
  await pause(3000);
}

const rows = [];
for (const e of elements) {
  const t = e.tags ?? {};
  const name = (t.name ?? "").trim();
  const p = e.center ?? e;
  if (!name || p.lat == null) continue;
  // Guest houses and hostels only when the name says they rent rooms long-term
  if ((t.tourism === "guest_house" || t.tourism === "hostel") && !/(dorm|dormitel|boarding|apartment|pad)/i.test(name)) continue;
  if (NOT_RESIDENTIAL_NAME.test(name)) continue;
  // Must be tagged as a place people live: streets, shops and restaurants that only share a name are out
  const residential = /^(apartments|dormitory|residential)$/.test(t.building ?? "") || t.amenity === "dormitory" || t.residential === "apartments" || /^(apartment|guest_house|hostel)$/.test(t.tourism ?? "");
  if (!residential) continue;
  // Subdivisions and villages are neighbourhoods, not rentable buildings
  if (t.landuse === "residential" && t.residential !== "apartments") continue;
  if (t.building === "residential" && !RESIDENTIAL_NAME.test(name)) continue;
  rows.push({
    ref: `osm:${e.type}/${e.id}`,
    name,
    kind: kindOf(t),
    street: t["addr:street"] ?? null,
    district: nearestArea(p.lat, p.lon),
    lat: p.lat,
    lng: p.lon,
  });
}

// Same name within ~60 m (a node and a way for one building) counts once: keep the area feature
const kept = [];
for (const r of rows.sort((a, b) => (a.ref.startsWith("osm:node") ? 1 : 0) - (b.ref.startsWith("osm:node") ? 1 : 0))) {
  const dup = kept.find((k) => k.name.toLowerCase() === r.name.toLowerCase() && Math.abs(k.lat - r.lat) < 0.0006 && Math.abs(k.lng - r.lng) < 0.0006);
  if (!dup) kept.push(r);
}

const byKind = kept.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {});
const byArea = kept.reduce((m, r) => ((m[r.district] = (m[r.district] ?? 0) + 1), m), {});
console.log(`Overpass elements: ${elements.length} | directory candidates: ${rows.length} | after merge: ${kept.length}`);
console.log("by kind:", byKind, "\nby area:", byArea);
if (DRY) {
  for (const k of Object.keys(byKind)) console.log(k + ":", kept.filter((r) => r.kind === k).slice(0, 12).map((r) => r.name).join(" | "));
  process.exit(0);
}

const sql = neon(url);
const [src] = await sql`
  insert into sources (key, name, kind, basis, licence, attribution, homepage, automated_access_allowed, storage_allowed, photos_allowed, notes, reviewed_at)
  values ('openstreetmap', 'OpenStreetMap', 'open_data', 'open_licence', 'ODbL 1.0', '© OpenStreetMap contributors (ODbL)',
          'https://www.openstreetmap.org/copyright', true, true, false,
          'Directory of buildings only. Never a source of prices or vacancies. Light Overpass use; own extract before regular refreshes.', now())
  on conflict (key) do update set reviewed_at = excluded.reviewed_at
  returning id`;

let inserted = 0, updated = 0;
for (const r of kept) {
  const [row] = await sql`
    insert into buildings (source_id, external_ref, name, kind, street, district, lat, lng, status, last_checked_at)
    values (${src.id}, ${r.ref}, ${r.name}, ${r.kind}, ${r.street}, ${r.district}, ${r.lat}, ${r.lng}, 'unverified', now())
    on conflict (source_id, external_ref) do update
      set name = excluded.name, lat = excluded.lat, lng = excluded.lng, last_checked_at = now(), updated_at = now()
    returning (xmax = 0) as inserted`;
  row.inserted ? inserted++ : updated++;
}
console.log(`dev branch: ${inserted} inserted, ${updated} refreshed`);
