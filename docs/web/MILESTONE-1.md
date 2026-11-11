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
- Accounts (Neon Auth), owner portal, inquiries, moderation and admin: schema only, no screens.
- No database is connected; `drizzle/0000_init.sql` is generated but not applied.
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
