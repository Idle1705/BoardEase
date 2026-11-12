# BoardEase launch readiness: limited public pilot (2026-11-12)

## Recommendation

**NO-GO for a public pilot today. GO for a closed, invite-only pilot (10-20 owners you know) once the six "before any real owner" items below are done.** They are mostly configuration and decisions, not missing features: the workflow itself passed end to end.

## What was audited

| Area | Before this work | Now |
|---|---|---|
| Finder data | 100% hard-coded demo listings; the DB query for listings existed but nothing used it | Real published listings from Neon; demos only behind `BOARDEASE_DEMO_LISTINGS=1`, always badged |
| Owner inventory | Properties and rooms; "free beds" always equalled capacity (no way to record occupancy) | Rent and availability editable per room; whole units and single rooms behave as one space |
| Listings | Table existed, no UI, per-room model, no lifecycle | One listing per property, checklist, review, publish/pause, 30-day confirmation |
| Photos | None (`storage_key` column only) | Secure upload to Neon Object Storage, metadata stripped, removal deletes files |
| Inquiries | Table existed, nothing wrote to it | Full in-app workflow for renters and owners |
| Moderation | None | Admin review queue, reports, admin pause with reason, event log |
| Database (main = production) | 24 tables, 3 accounts, 1 property (QA Test Boarding House, 3 rooms), 0 listings | Migration 0002 applied 2026-11-12 (26 tables); data unchanged. Dev work stays on `marketplace-dev` |
| Hosting | Vercel project `boardease`, production deployment 16 h old, env: DATABASE_URL, NEON_AUTH_*. **Deployment Protection is on**: every page redirects to Vercel sign-in, so the site is private to the Vercel team | Storage env added (2026-11-12). No deploy yet. For a public pilot, turn Deployment Protection off for Production |

## Real data vs demonstration data

- **Real:** accounts (Neon Auth), properties/rooms/listings/photos/inquiries created by owners. On main today: 1 QA test property, no listings. Nothing has been published on main.
- **Demonstration:** `web/src/data/demo-listings.ts` (Wikimedia stand-in photos). Off by default; landing-page screenshots show them labelled "Demo listings, not for rent".
- **External references / directory:** the discovery prototype on branch `discovery-dev` (OpenStreetMap buildings, advertiser-submitted links). Separate from BoardEase inventory and not in the finder. Source rules: `DISCOVERY-FEASIBILITY.md` (no scraping of Google Maps, Facebook, Lamudi, RentPad; Verdon Parc and Avida only via partnership or unit owners).
- The QA Test Boarding House has no listing and is not published.

## Before any real owner (blockers)

1. ~~Apply migration 0002 to main~~ **Done 2026-11-12** (snapshot branch `backup-pre-0002-2026-11-12` taken first; main now 26 tables, all existing rows intact). Code committed (3cc2023, branch `web/rental-discovery`) and **deployed to Vercel Production 2026-11-12** (https://boardease-two.vercel.app, behind Deployment Protection). Checked: pages 200, finder shows the empty state with no demos, unknown listing 404s, signed-out upload 401, no errors in function logs.
2. ~~Production photo storage~~ **Done 2026-11-12:** bucket `listing-photos` (public_read) on main, storage credential created and tested (write, public read, delete), five `S3_*` variables added to Vercel Production (secret ones marked sensitive). They take effect on the next deploy.
3. **Name at least one reviewer** and grant `admin` by hand. Nobody can approve listings until then. Admin must not be one of the pilot owners (admins can't review their own listings anyway).
4. **Privacy:** the `/privacy` page is a marked draft. It needs legal review, a named Data Protection Officer and contact (RA 10173), and the two promises it makes must be built or reworded: deleting closed inquiries after 12 months (no job yet) and a self-service account deletion (no flow yet; today it would be a manual request).
5. **Vercel plan:** Hobby is for personal, non-commercial use. If the pilot is commercial, move to Pro before launch (check current terms and price on vercel.com/pricing).
6. **Geocoding identity:** property creation uses OpenStreetMap Nominatim (max about 1 request per second, must identify the app). Set `GEOCODER_USER_AGENT` to an app name with a contact address in Vercel before owners onboard.

## Before a public (open sign-up) pilot

- Owner notifications: today owners must open the portal to see inquiries. Add email via a provider (e.g. Resend) once a sending domain exists; test delivery before claiming it.
- Abuse: limits are per account (inquiries, messages, uploads, reports). There is no CAPTCHA or IP limit on sign-up/sign-in; add Cloudflare Turnstile and check Neon Auth's email verification setting.
- Ownership: reviewers check photos and details by eye; there is no document verification of ownership yet (the claims flow exists only in the discovery prototype).
- Monitoring: errors go to Vercel function logs only. Add error tracking and an uptime check.
- Backups: Neon keeps a restore window that depends on the plan; confirm it covers at least 7 days before real data, and test one branch restore.
- Orphan sweep: removed photos delete their files; a periodic sweep for any file without a row (e.g. after a failed delete) is not built.

## Security and privacy findings

| Check | Result |
|---|---|
| Authentication | Neon Auth; protected routes (`/owner`, `/admin`, `/account`, `/inquiries`) redirect when signed out (verified 307) |
| Server-side roles | Role read from `profiles`, never from the browser; admin not grantable by sign-up |
| Cross-owner isolation | Every owner query and action is scoped by the session owner id; other owners get "not found" (integration + browser tests) |
| Private address | Exact address and exact point never selected by public queries; public point offset 80-180 m; checked on the public page |
| Renter privacy | Owners see display name only; phone only if the renter shared it for that inquiry; emails never shown |
| Upload security | Auth + ownership before storage, 4 MB limit, magic-byte type check, decode limit, re-encode, random keys; unauthenticated upload refused (401) |
| Input validation | zod on every action plus database checks (message length, phone format, capacity, rent, statuses) |
| Secrets | Neon API key only in the user env var; DB and S3 credentials only in gitignored env files; nothing secret in git |
| Dev/prod separation | Local dev → `marketplace-dev` via `.env.development.local`; integration tests refuse main; main untouched |
| Known framework issue | Next.js 16.4.6 dev server can throw a cookies invariant after form submits; production builds don't (tested) |

## Costs and limits (verify on the providers' pages before launch)

- **Neon:** database, auth and object storage on one project. Object Storage Free plan: 5 GB per project, paid plans metered per GB. Database compute/storage limits depend on the plan: see neon.com/pricing.
- **Vercel:** Hobby is free but non-commercial; Pro is per member per month. Function request bodies are limited to about 4.5 MB, which is why photos are shrunk in the browser first.
- **Map tiles:** OpenFreeMap (free, OSM attribution shown). **Geocoding:** Nominatim public instance, light use only.
- A pilot of 20 listings × 20 photos × ~300 KB ≈ 120 MB of storage.

## Acceptance test (2026-11-12, production build, `marketplace-dev`)

18/18 passed: owner signs in, creates a property (geocoded, exact address private), adds a 3-bed shared room and a single room, saves details, uploads 2 photos through the real route, passes the checklist, is approved, publishes; the listing appears in the finder; a ₱2,000 budget and a 0.5 km radius elsewhere both exclude it; the public page shows rooms and availability without the exact address; the owner marks 2 beds taken and the public page shows 1 of 3 free; a renter's inquiry reaches only the listing's owner; the owner's reply reaches the renter; another owner's property page is not found; no horizontal scroll at 390 px; no uncaught errors. Test records and files were deleted afterwards.
