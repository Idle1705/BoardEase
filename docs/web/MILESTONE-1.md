# Web milestone 1: rental discovery screen

Branch `web/rental-discovery`. The Python desktop app in `src/`, its tests and `billing_ledger.xlsx` are untouched.

## Repository audit

| Part | Verdict |
|---|---|
| `bill.py`: money rounding, date/month/contact validation, bill status, statements | **Ported** to `web/src/lib/billing.ts` (integer centavos) |
| `utility_reading.py`: fair split of rent, electricity and water | **Ported** (`allocateCharges`, `splitCents`) |
| `boarding_house.py`: rooms, tenants, transfer/remove, bill generation, payments, overdue, summary | Rules **ported**; the in-memory model is replaced by Postgres tables scoped by `owner_id` |
| `room.py`, `single_room.py`, `shared_room.py` | Became `rooms.kind` + capacity check constraints (single 1, shared 2 or 3) |
| `excel_ledger.py` | **Replaced** by Neon Postgres. Append-only payments keep the ledger's spirit |
| `gui_app.py`, `ui_components.py` | **Replaced** by the web UI |
| `notification.py` | Message wording kept for later reminders; sending (SMS/email) not built |
| Tests (`tests/test_workflow.py` etc., pytest) | Reference cases copied into `web/src/lib/billing.test.ts` (14 tests, Vitest) |

## Stack

Next.js 16 (App Router, Cache Components on) · TypeScript · Tailwind 4 · shadcn/ui (Base UI) · MapLibre GL 6 with OpenFreeMap Positron tiles · GSAP 3 · Drizzle ORM + `@neondatabase/serverless` · Vitest. No Supabase.

## What works now

- Desktop split: map left, featured listing and card rail right; tablet and phone get a Map/List switch, bottom-sheet filters and a card rail over the full-screen map.
- Location search with Davao suggestions and a server-side place search (`/api/geocode`).
- Budget, distance, room type and sort; all kept in the URL (`?max=8000&km=5&type=apartment&sort=price-asc&id=…`).
- Map markers ↔ cards stay in sync (select, hover, saved dot). "Search this area" after panning. Locate me, with a clear message when permission is denied.
- Photo gallery (arrows, dots, swipe, arrow keys), details dialog, honest "Contact owner" dialog for demo listings.
- Saved listings on this device (`/saved`). Empty state suggests the next radius or budget that would find something.
- Failure states: map tiles fail → retry panel; missing photo → placeholder; place search down → message.
- `prefers-reduced-motion` respected everywhere (CSS and GSAP).

## Still demonstration or not built

- **All 10 listings are demo data** (`web/src/data/demo-listings.ts`), badged on every card. Photos are licensed Wikimedia stand-ins showing other places (`/credits`).
- Owner portal, inquiries, moderation and admin: schema only, no screens.

## Accounts (Neon Auth), added 2026-11-11

- Neon Auth (managed Better Auth) is enabled on the `main` branch via the Neon API. Users and sessions live in the `neon_auth` schema; our `profiles` table holds the role.
- Pages: `/sign-up` (renter or owner; admin is never self-chosen), `/sign-in`, `/account`. `src/proxy.ts` protects `/account`, `/owner` and `/admin`.
- `getCurrentUser()` and `requireRole()` in `src/server/profiles.ts` read the role from the database on the server. Use `requireRole` at the top of every private server action.
- Tested in the browser: sign-up as owner, profile row created, wrong password error, log in, log out, header state, redirect when signed out.
- Not tested: duplicate-email sign-up message, password reset (not built).
- **Before launch:** turn on email verification (`require_email_verification` is off), set up an email provider for resets, and add the production domain to Neon Auth's trusted domains.
- **Dependency exception (approved 2026-11-11):** `@neon/auth` depends on `@supabase/auth-js` and imports only its error classes. No Supabase service, key or network call is involved.
- Local test account: `TEST_OWNER_EMAIL` / `TEST_OWNER_PASSWORD` in `web/.env.local`.
- Neon project `boardease` (Singapore, Postgres 17) exists and `drizzle/0000_init.sql` is applied (14 tables). It holds no data yet, and the app still reads demo listings. `DATABASE_URL` is in `web/.env.local` (gitignored). Apply new migrations with `npx drizzle-kit migrate` after loading that file.
- No photo upload: Neon has no object storage. Pick Cloudflare R2 or Vercel Blob.

## Before launch

- Geocoder: Nominatim's policy forbids heavy use. Move to a paid or self-hosted geocoder (`GEOCODER_URL`).
- Tiles: OpenFreeMap is free with attribution and no key; consider a paid fallback for uptime.
- Marker clustering when listings get dense.

## Run it

```bash
cd web
npm install
npm run dev
npm test
```
