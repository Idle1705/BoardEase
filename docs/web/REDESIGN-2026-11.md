# BoardEase premium redesign, 2026-11-11

Branch `web/rental-discovery`, **not committed**. Before starting, the earlier uncommitted design work was snapshotted without touching the working tree: `git stash list` → `stash@{0}: pre-redesign snapshot 2026-11-11`, plus `C:\Users\mance\BoardEase-backups\pre-redesign-2026-11-11\` (patch + untracked files).

## 1. Issues found in the original UI (audit, ranked)

| # | Severity | Issue |
|---|---|---|
| 1 | High | No landing page: `/` was the finder, so nothing explained BoardEase or routed owners |
| 2 | High | Brand not applied: Geist font, Apple-grey neutrals and a "Davao green" accent instead of the locked Fired Clay / Deep Ink / Porcelain / Limestone / Garden palette and Familjen + Hanken type |
| 3 | High | "List your property" was a static text page; no owner portal existed behind it |
| 4 | Medium | Focus rings were drawn at 50% opacity (shadcn `outline-ring/50`), about 2:1 contrast, below WCAG 2.4.11 |
| 5 | Medium | Desktop-only finder overlays relied on JavaScript to hide on phones; the "Show list" card could appear over the phone list |
| 6 | Medium | Selected pin was Deep Ink, the same weight as the header; selection did not carry the brand accent |
| 7 | Low | Gallery had dots but no visible count and no full-screen view |
| 8 | Low | Header nav was a component-library row (pill hovers, no active indicator beyond weight) |

## 2. Design decisions

- **Landing composition** (sections differ on purpose):
  - Hero: asymmetric editorial layout. One portrait room photo is the anchor, a smaller building photo overlaps it, and an "Example listing" price card and a location label sit on top.
  - Intro: real interface excerpts (a renter card and an owner rooms table), not icons.
  - Two pathways: a photo-led renter card on Porcelain beside a type-led owner card on Limestone.
  - Explore nearby: an illustrative drawn map with the real demo listings at their coordinates.
  - How it works: two numbered journeys with Familjen Clay numerals.
  - Why BoardEase: an honest "Working today" vs "In development" split.
  - Close: a Deep Ink CTA with a corridor photo, then the footer.
- **Backgrounds**: Porcelain base. A single "daylight" field behind the hero and intro: a 7.5% Clay light from the upper right and a 5% Garden shade lower left, tuned by eye. A faint 96 px drafting grid, masked, sits only behind the hero photos. White for the pathways and the preview, Deep Ink once for the closing CTA. Nothing decorative behind the map or the owner portal.
- **Colour roles**:
  - Clay for primary actions, the active nav rule, the selected pin and card, and focus.
  - Deep Ink for secondary dark actions.
  - Garden only on real availability ("2 of 3 free") and success messages.
- **Type**: Familjen only for brand headlines, the hero, sections and numerals; Hanken everywhere else. Display size is clamped from 44 to 76 px, section headings from 30 to 44 px.
- **Motion**:
  - Hero entrance is CSS only: a lead rise of 18 px, then copy, CTAs and images settling, in about 100 ms steps over 0.56 to 0.76 s.
  - Scroll reveal is once per block, visible without JavaScript, and off under reduced motion.
  - Finder panel: 320 ms in, 180 ms out. Lightbox: 200 ms.
  - Success messages rise 4 px. Buttons press to 0.97.
- **Rejected**:
  - Glassmorphism, gradients behind the map, parallax and Lenis smooth scrolling.
  - Animated pins, autoplay galleries and hero video.
  - Three-card icon grids, stock "business people" photos and any invented statistics.

## 3. Resources actually consulted

- `design-research` skill and `~/.claude/design-knowledge/` (motion-principles, visual-foundations, components, accessibility-checklist, qa-and-performance).
- Emil Kowalski `choreograph` skill (read: stagger and hero-sequence rules) and `animate` (read earlier today).
- Hallmark SKILL.md (read earlier today; its floor rules on tokens, `overflow-x: clip` and focus-visible informed checks). Hallmark itself was not run.
- Vercel Web Interface Guidelines (read earlier today): URL state, focus, image sizes.
- Unsplash, browsed in the built-in browser with `license=free` to pick photos. Licence and photographer were checked on each photo page.
- Not available on this PC: a "design-intelligence" skill and a "Claude Design Intelligence Playbook". Not opened this session: Design Spells (rate-limited earlier), Mobbin (login), Apple HIG pages beyond those read earlier.

## 4. Changes implemented

- Locked palette and fonts as tokens, plus derived tints and contrast-checked text colours.
- New landing page (`/`), About page, rebuilt owner onboarding (`/owners`), restyled content pages, and Unsplash credits.
- Finder moved to `/find`. Old `/?…` finder links get a 308 to `/find` with every query parameter.
- Header: the new nav (Home, Looking for a Board?, List Your Property, How It Works, About), a Clay active rule, and Porcelain on marketing pages.
- Finder:
  - Clay selected pin, ring, ping and saved dot; Clay "View details".
  - Photo count ("1 / 3") and a full-screen viewer: arrows, swipe, keys, Esc, focus return, real proportions.
  - Phone-safe overlays and an accessible loading state.
- Owner portal (`/owner/dashboard`, `/owner/properties`, `/owner/properties/[id]`, `/owner/rooms`):
  - Owner-only gate; every query is scoped by the session's owner id.
  - Add property: geocoded street, public point moved 80 to 180 m.
  - Add room: single (1 bed), shared (2 to 3 beds, rented per bed) or whole unit, validated like the database checks.
  - Availability is per bed from active tenancies.
  - Inquiries, Tenants, Billing, Reports and Settings are listed as "Soon" and not linked.
- Sign-up accepts `?role=owner`.
- Focus rings restored to full Clay (removed shadcn `outline-ring/50`).

## 5. Files

New:
- `web/src/app/find/page.tsx`, `web/src/app/about/page.tsx`
- `web/src/app/owner/` (layout, nav, gate, ui, forms, actions, dashboard, properties, properties/[id], rooms)
- `web/src/server/owner.ts`
- `web/src/components/landing/` (landing-page, nearby-preview, reveal), `web/src/components/site-footer.tsx`, `web/src/components/explore/lightbox.tsx`
- `web/public/editorial/` (6 photos + `MANIFEST.md`)

Changed:
- `web/src/app/globals.css`, `layout.tsx`, `page.tsx`, `proxy.ts`
- `web/src/app/owners/page.tsx`, `credits/page.tsx`, `how-it-works/page.tsx`
- `web/src/app/(auth)/sign-up/page.tsx`, `(auth)/auth-forms.tsx`, `account/page.tsx`, `saved/saved-list.tsx`
- `web/src/components/site-header.tsx`, `content-page.tsx`
- `web/src/components/explore/` (explore-view, featured-listing, gallery, listing-card, listing-dialogs, map-view, bits)
- `docs/web/DESIGN_SYSTEM.md`

## 6. Screenshots

`docs/web/screenshots/redesign/before/` (5) and `after/` (14).

- **How they were taken**: real headless Edge captures, not mock-ups.
- **Phone captures (390, 375)**: the page loads in an exact-width iframe inside a 520 px frame, because headless Edge will not size a window under about 500 px. The grey or white strip on the right is the frame, not the page.
- **Map tiles**: headless Edge does not draw them (MapLibre WebGL stays on "Loading map…"). Map views were checked live in the built-in browser instead.

## 7. Responsive

Checked:
- **Landing**: 1920, 1440, 1280, 768, 390 and 375.
- **Finder**: 1440, 1280 and 1024 (floating panel), 768, 390 (list) and 375 (map).

No horizontal overflow at 390 (scroll width = 390).

## 8. Accessibility

axe-core 4.10, with WCAG 2.2 AA and best-practice rules:
- **0 violations**: `/`, `/owners`, `/about`, `/credits`, `/how-it-works` and `/find` at 1440, and `/`, `/owners` and `/find` at 390.
- **1 situational finding** on `/find` with the panel open: a pin can sit partly under the floating filter chips after the map moves (`target-size`).

Manual checks:
- Tab order on the landing page.
- Clay focus ring at full strength (5:1).
- Lightbox: Enter opens it, → moves, Esc closes, focus returns to the expand button.
- Signed out, owner routes redirect to `/sign-in`.

## 9. Functional tests run

- `tsc --noEmit`: clean, apart from Next's stale generated route types before a dev compile.
- `eslint src`: clean.
- `vitest`: 14/14.
- `next build`: 19 pages; the landing page is static.
- curl: 308 redirect `/?max=4000&km=1&view=map` → `/find?max=4000&km=1&view=map`; all public routes 200; owner routes 307 to sign-in.
- Browser: filters from the old link applied (₱4,000, 1 km → 2 listings), pin → panel, lightbox.

**Owner portal, tested signed in** (2026-11-11, account "TESTOWNER", role set to owner in the dev database at the user's request):
- A renter account sees "This area is for property owners" and no data.
- Empty dashboard state.
- Add property: a missing street shows an error and keeps the fields. A real save geocodes to Matina Aplaya, and the public point is 152 m from the exact one.
- Add rooms: single at ₱3,500 (1 bed); shared with 4 beds is rejected ("2 or 3 beds"); shared at ₱2,000 per bed with 3 beds; whole unit with 2 beds. The form resets after each save.
- Duplicate room name: the message is now `There is already a room called "room 1" here.` This was fixed during testing; it used to be generic.
- Per-bed availability, with two temporary tenancies inserted (Room 1 full, one bed taken in Room 2): Room 1 "0 of 1 free", Room 2 "2 of 3 free", property "4 of 6 free"; the dashboard shows 6 beds, 2 occupied and 4 free.
- Authorization: another owner's property id returns a 404 with no data shown. A tampered hidden property id in the room form is refused by the server ("You don't have access to this property"), and no room is created.
- axe on dashboard, properties, property detail, rooms (1440 and 390) and the landing page: 0 violations, after two fixes. Green text on the green tint now uses `garden-ink` #3D6450 (4.5:1 or better), and the scrollable rooms table is a focusable, labelled region.
- Test data left in place: the property "QA Test Boarding House" with 3 rooms, owned by TESTOWNER. The injected tenancies and the other owner's test property were deleted.

## 10. Incomplete / next

- Editing and deleting properties and rooms (only adding exists).
- Listings with owner-uploaded photos (needs object storage: R2 or Vercel Blob), inquiries, tenants, billing UI.
- Available / unavailable states in the finder need real published listings with occupancy.
- Amenities and availability filters (shown as "soon" on the landing page).
- Keep floating filter chips from covering pins after a map move.
- The geocoder for owner properties is Nominatim (development only); switch before launch.
