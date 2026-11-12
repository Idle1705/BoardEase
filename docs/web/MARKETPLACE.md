# BoardEase marketplace: how real listings work (2026-11-12)

The finder now runs on real, owner-published inventory in Neon. Demonstration listings are off unless the server sets `BOARDEASE_DEMO_LISTINGS=1`, and they stay badged as demos when on.

## Data model (migration `web/drizzle/0002_marketplace.sql`, additive; applied to dev branches and to main on 2026-11-12)

| Table / column | Purpose |
|---|---|
| `listings.property_id` (unique) | One public listing per property. `room_id` and `monthly_price_cents` are kept nullable (deprecated) for older rows and the discovery prototype. |
| `listings.status` | `draft → submitted → approved → published ⇄ paused`, `rejected` back to the owner, `archived` from anywhere the owner allows. |
| `listings.submitted_at / reviewed_at / reviewed_by / review_note` | Who reviewed, when, and the note the owner sees. |
| `listings.availability_confirmed_at` | The owner's last "availability is correct". Live only if within 30 days. Check: a published row must have it. |
| `listings.show_phone` | Owner's choice to show their profile phone. In-app inquiries always work. |
| `listing_events` | Every lifecycle change: actor, action, note. |
| `rooms.taken_manual` | Beds (or a single room / whole unit) the owner marked taken without a tenant record. 0 to capacity. |
| `listing_photos.room_id / owner_id / byte_size`, unique `storage_key` | Property or room photos; Postgres keeps only the object key. |
| `inquiries.kind / room_id / renter_phone / owner_read_at` + checks | Question or viewing request; renter phone only if the renter chose to share it with that owner; message 10-1000 chars; no self-inquiry. |
| `inquiry_messages` | The thread under an inquiry, 1-1000 chars per message. |

Price and availability are computed from rooms at read time, so a listing can't drift from the inventory.

## Availability rules (`web/src/lib/marketplace.ts`, `roomSpaces`)

- Shared room: rented per bed. Free = beds - (active tenancies + `taken_manual`).
- Single room / whole unit: one space. Free only when nobody holds it.
- Taken is clamped to [0, capacity]; an occupied bed is never counted as free.
- A listing is shown in the finder only when published, the owner is not suspended, availability was confirmed in the last 30 days, and at least one space is free. Its page stays reachable (marked full) so shared links keep working.

## Lifecycle and who may do what

| Move | Who | Extra rule |
|---|---|---|
| draft/rejected → submitted | Owner | Checklist complete: title, kind, description ≥ 60 chars, street + barangay, ≥ 1 room with rent, ≥ 2 photos |
| submitted → approved/rejected | Admin | Not their own listing; rejection needs a note |
| approved/paused → published | Owner | Publishing counts as confirming availability |
| published → paused | Owner or admin | Admin must give a reason (e.g. after a report) |
| → archived, archived → draft | Owner | |

Admin is a separate role granted by hand in the database (`profiles.role = 'admin'`), never by sign-up. Admins never publish for an owner.

## Photos (`web/src/app/api/owner/photos/route.ts`, `web/src/server/storage.ts`)

- Storage: **Neon Object Storage**, bucket `listing-photos` (`public_read`), in the same region as the database (Singapore). Chosen because it is S3-compatible, branch-aware (test uploads on a dev branch never reach production), included in Neon (Free plan: 5 GB per project) and needs no second vendor. Sources: [overview](https://neon.com/docs/storage/overview), [buckets API](https://neon.com/docs/reference/api/buckets).
- Upload path: browser shrinks to ≤ 2400 px JPEG (drops metadata) → route checks signed-in owner role and property ownership → 4 MB limit → real type from magic bytes (JPEG/PNG/WebP) → sharp rotates, resizes to ≤ 2000 px, re-encodes WebP (no EXIF/GPS/XMP/ICC; verified) → minimum 600 × 400 → random key `p/<property>/<uuid>.webp` → DB row; if the DB insert fails the file is deleted. 60 uploads per owner per hour, 20 photos per listing.
- Removal deletes the row, then the file. Photo keys are only handed out for published listings and to the owning owner.
- `next/image` serves resized versions; only `**.aws.neon.tech/listing-photos/**` is allowed as a remote image source.

## Inquiries

- Any signed-in user can ask about a live listing that isn't their own: a question or a viewing request (day from today to 90 days ahead), optionally about one room, optionally sharing a mobile number with that owner.
- Limits: one open inquiry per renter and listing; 5 new inquiries per renter per hour; 30 messages per user per hour; no links in a renter's messages.
- Owners see only inquiries addressed to them, renters only their own; the renter appears by display name, never email. Thread pages 404 for anyone else.
- Owner statuses: Replied, Viewing set, Resolved (closed). Renters can close their own.
- In-app only. No email/SMS is sent and the UI never says otherwise.

## Screens

| Route | Who |
|---|---|
| `/find` | Everyone: real published listings on the map |
| `/listings/[id]` | Everyone (live); owner and admins also see a preview of non-live listings |
| `/owner/properties/[id]` | Owner: rooms + rent + availability, listing details, photos, status and checklist |
| `/owner/inquiries`, `/owner/inquiries/[id]` | Owner inbox and threads |
| `/inquiries`, `/inquiries/[id]` | Renter's inquiries and threads |
| `/admin` | Admin review queue and reports |
| `/privacy` | Draft privacy notice (RA 10173) |

## Environments

- Local development uses the Neon branch **`marketplace-dev`** via `web/.env.development.local` (gitignored). `next build`/`next start` and Vercel use `DATABASE_URL` from `.env.local` / Vercel = **main (production)**.
- Photo storage env (server only): `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Each Neon branch has its own endpoint and credentials.

## Tests

- `npm test`: 47 unit tests (availability, checklist, lifecycle, freshness, phone and spam rules, discovery, billing).
- `npm run test:integration`: 16 tests on dev branches only (7 marketplace acceptance + 9 discovery). They refuse to run against main.
- Browser acceptance (production build on `marketplace-dev`, headless Edge, existing QA test owner, tagged records cleaned up): 18/18 on 2026-11-12. Steps 1-12 of the brief, plus price and radius filters, no exact address on the public page, phone layout and no uncaught errors.
