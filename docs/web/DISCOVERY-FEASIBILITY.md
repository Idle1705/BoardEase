# Real-world rental discovery: source-rights feasibility (2026-11-12)

BoardEase should help people find real rooms in Davao City before every landlord registers, without becoming a pile of copied posts. This file decides, per source, what BoardEase may collect, store and show. It is research, not legal advice: confirm anything commercial with the source in writing.

**Rule used throughout:** publicly visible ≠ permitted. A source is used automatically only if it offers an API or licence that allows our use. Bot challenges, "Access Denied" responses, login walls and rate limits are access controls and are never bypassed.

## Current BoardEase (inspected)

- Map: MapLibre GL with OpenFreeMap tiles (OpenStreetMap data, ODbL attribution shown). Geocoding: Nominatim for owner addresses (dev-only volume).
- Search: client-side filter over listings (price, distance, type, sort); finder at `/find`.
- Neon schema: `properties` (private exact address + public approximate point), `rooms` (single / shared per bed / unit, capacity), `listings` (draft/published, moderation), `tenancies` (occupancy → free beds), `inquiries`, `reports`, `owner_verifications`.
- Owner portal: properties, rooms and availability are live; listings, inquiries and billing are next.

## Feasibility matrix

| Source | 1. Data available | 2. Automated access authorised? | 3. Index / store allowed? | 4. Photos reusable? | 5. Official API or licence | 6. Cost | 7. How availability is verified | Verdict |
|---|---|---|---|---|---|---|---|---|
| **BoardEase owners (first party)** | Everything the owner enters: rooms, beds, rent, photos | Yes, our own system | Yes, under our terms | Yes, owner-provided with consent | Our own | Neon + storage | Occupancy from tenancies; owner confirms periodically | **Core source** |
| **OpenStreetMap** (Overpass / extracts) | Names, types and points of dorms, dormitels, apartment buildings, condos (252 relevant features in the pilot box, incl. Avida Towers Davao, Avida Towers Abreeza, Verdon Parc, Aeon Towers, Abreeza Place, Palmetto Place, Mesatierra) | Yes: public Overpass for light one-off queries; own instance or extract for regular use ([usage policy](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)) | Yes, under [ODbL](https://osmfoundation.org/wiki/Licence_and_Legal_FAQ): attribution required; a publicly offered derivative database must stay ODbL | No photos in OSM | ODbL | Free (own instance later: server cost) | **Not at all.** OSM says a building exists, never that it has a vacancy or a price | **Use for the property directory only**, reviewed before publishing; tags can be wrong (e.g. Avida Towers Davao tagged as a 5-storey commercial building) |
| **Google Maps Platform (Places)** | Place names, addresses, ratings, photos, opening hours | Yes, by API key | Only the `place_id` may be stored indefinitely; other content can't be pre-fetched, indexed or cached beyond the agreement ([policies](https://developers.google.com/maps/documentation/places/web-service/policies)) | Only shown live with attribution, not stored | Yes (paid API) | Pay per request after free credit | None: Places has no rental availability | **Reject for now**: Places content may not be shown on a non-Google map ([service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)), and BoardEase uses MapLibre. Revisit only if we ever switch the map |
| **Developer leasing (DMCI Homes for Verdon Parc)** | Unit types and rent offers on developer sites; Verdon Parc leasing via DMCI Homes Leasing Services and its Davao property management ([DMCI](https://www.dmcihomes.com/whats-new/news/dmci-homes-davao-condo-offers-rent-to-own-option-for-homebuyers)) | No API found; site content is the developer's | Not without permission | No | None public | Partnership terms | Their leasing office | **Partnership only**: contact DMCI Homes Leasing for a feed or referral link; until then show Verdon Parc as a directory building with a link to the official leasing page |
| **Developer (Avida / Ayala Land)** | Project pages; no official Davao leasing listings found | No API found | Not without permission | No | None public | Partnership terms | Developer or unit owners | **Partnership only**; Avida buildings appear as directory entries. Rentals there come from individual unit owners, who can claim and list |
| **Lamudi** | Rent ads from agents and owners | **No**: automated requests get "Access Denied"; no public API (third-party scrapers exist, which is not permission) | No | No (advertisers' photos) | None public; partner route would need Lamudi's agreement | Unknown | Lamudi's own | **Do not collect.** Approach Lamudi for a partner feed if wanted |
| **RentPad** | Rent ads | **No**: Cloudflare bot challenge on every automated request | No | No | None found | Unknown | RentPad's own | **Do not collect.** Partnership only |
| **Dot Property / Trovit** | Rent ads incl. Avida and Verdon Parc units | No API found; terms not confirmed | Not without permission | No | None public | Unknown | Theirs; listings often stale (e.g. Verdon Parc "9 units from ₱29,000" with no date) | **Do not collect** |
| **Facebook Marketplace / Groups** | Many Davao boarding-house posts | **No**: no API for Marketplace; Groups API removed in 2024 ([TechCrunch](https://techcrunch.com/2024/02/05/meta-cuts-off-third-party-access-to-facebook-groups-leaving-developers-and-customers-in-disarray/)); Content Library API is for approved academic research only ([Meta](https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/fb-marketplace)) | No | No | None for this use | n/a | n/a | **Do not collect.** Instead let the landlord who wrote the post submit their own link to BoardEase (they own it) |
| **Airbnb / short-stay** | Daily and monthly condo stays (e.g. at Avida Towers) | No: API is for approved software partners, not accepting new requests; its terms bar building databases from it | No | No | Partner-only | n/a | Theirs | **Do not collect.** Short-term units come in only through owners who list on BoardEase |
| **Owner-submitted external links** | A landlord's own ad elsewhere (their Facebook post, their Lamudi ad) submitted by them | Not automated: the advertiser submits | Yes for what they submit, with their consent; we store the link and the facts they enter, not copied photos | Only photos they upload to us | Our terms + their consent | None | They confirm; link checked for being alive; expires after 14 days unless reconfirmed | **Allowed, with moderation**: this is the "permitted external listing reference" |
| **Direct partnerships** (landlords, property managers, dorm associations, universities' housing offices) | Rooms, rates, availability | By agreement | By agreement | By agreement | Written agreement / feed | Negotiated | Partner feed or monthly confirmation | **Best route for scale**; start with 3-5 Davao partners near UM Matina and Poblacion |

## What the pilot therefore contains

1. **First-party listings** from owners (the existing portal), with photos they upload.
2. **Property directory** seeded from OpenStreetMap for Matina, Ecoland, Poblacion, Bajada and Lanang, attributed to OpenStreetMap, each entry reviewed (status `unverified` until a moderator checks it). Buildings are never shown as rentable.
3. **External references** only from advertisers who submit their own link, or from a partner who signed up. None are collected automatically. At launch this list is empty, and that is correct.
4. **No** Google Places, Lamudi, RentPad, Dot Property, Facebook or Airbnb data.

## Rules the data model enforces

- A building is not a listing. Only a published first-party listing, or a published external reference, can be a rentable result.
- An advertised listing is not a confirmed vacancy. Verification is a separate record (who checked, how, when, result). External references expire after 14 days without a fresh check.
- Ownership of a directory building is never granted from an email address or from knowing the address: a claim needs evidence and a moderator's approval.
- Renters' requests show a district and a budget, never a phone number or exact location; replies go through BoardEase messages.
- Duplicates: one directory building per OSM element; an external reference is unique by its normalised URL, and is linked to a building when one matches by name and distance.

## Open questions for the owner of BoardEase

- Which partners to approach first (DMCI Homes Leasing for Verdon Parc; dorm owners near UM; university housing offices)?
- Whether to run our own Overpass extract monthly (needed before any regular refresh).
- Legal review of the owner-submitted link terms and the claim evidence list before launch.

## Prototype built (2026-11-12)

Everything below runs on the Neon **dev branch `discovery-dev`** (a copy of main). Main is untouched: migration 0001 is not applied there until you approve it.

| Part | Files |
|---|---|
| Data model: `sources`, `buildings` (directory), `property_building_links`, `external_listings`, `availability_checks`, `property_claims`, `renter_requests`, `request_responses`, `request_messages`, `building_follows`; `listings.rental_term` and `bedrooms`; reports can point at a building or an advert | `web/src/server/db/discovery.ts`, `schema.ts`, `web/drizzle/0001_discovery.sql` (additive only) |
| Rules: buildings never rentable, advertised ≠ confirmed, 14-day expiry to stale, dedupe (BoardEase first), URL normalisation, plain labels | `web/src/lib/discovery.ts` |
| Server logic with explicit actor: public read (no private fields), advertiser references (consent, https, one per advert, moderator publishes), claims (owner + evidence, moderator decides, links only the claimant's own property), renter requests (owners see district/budget/type/month only), private threads | `web/src/server/discovery/core.ts`, `db.ts` |
| Directory import from OpenStreetMap, 134 buildings in the five pilot areas, all `unverified` | `web/scripts/import-osm-directory.mjs` |
| `[TEST]` fixtures (1 confirmed listing, 1 current + 1 stale advert on example.test) | `web/scripts/seed-discovery-fixtures.mjs` (`--remove` deletes them) |
| Prototype page: map left (solid pins for BoardEase, outlined pins for adverts, dots for buildings), filters right (sources, rent range, distance, type, bedrooms, bedspaces, monthly/short, furnished, old adverts) | `/discover` → `web/src/app/discover/`, `web/src/components/discover/` |
| Owner claim form (evidence declared; file upload waits for the storage decision) | `/owner/claim/<building id>` → `web/src/app/owner/claim/` |

Not built yet: moderator screens (claims queue, publishing references), renter-request pages (logic and tests exist), evidence file upload (needs R2 or Vercel Blob), a scheduled job for `markStaleExternal`.

### Test results

- Unit (`npm test`): 30 passed (14 billing + 16 discovery rules: rentable rules, stale handling, filters, dedupe, URL normalisation, labels).
- Integration (`npm run test:integration`, dev branch only): 9 passed. Covers private-address protection, confirmed / unconfirmed / full, directory vs results, advertiser consent + https + duplicate refusal, stale expiry, claim authorization (renter refused, evidence required, owner can't decide, no linking to another owner's property), dedupe after a claim, renter-request privacy and thread access.
- Browser (headless Edge, desktop + 390 px): filters and source toggles change the results correctly; external links open in a new tab with `nofollow ugc`; signed-out visitors are sent to sign-in for `/owner/*`; the claim flow refuses missing evidence, keeps what was typed, accepts a valid claim and refuses a repeat.
- Found on the way: on the **dev server only**, the owner forms (existing "Add property" and the new claim form) can throw a Next.js internal cookies invariant after a submit. The production build does not (tested on `next start`). Worth re-checking after the next Next.js update.
