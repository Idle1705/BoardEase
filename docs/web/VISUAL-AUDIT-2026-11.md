# BoardEase visual audit and redesign pass, 2026-11-11 (second pass)

Branch `web/rental-discovery`, **not committed, not pushed**.

Before editing, the working tree was snapshotted without changes: `git stash list` → `stash@{0}: pre-audit snapshot 2026-11-11`, plus `C:\Users\mance\BoardEase-backups\pre-audit-2026-11-11\` (patch + untracked files).

No database records were reset or deleted, and no roles were changed in this pass. TESTOWNER had already been made an owner earlier today, with your approval. The QA Test Boarding House was left in place.

Tools:
- `design-research` skill and `~/.claude/design-knowledge` (visual-foundations, components, motion-principles, accessibility-checklist, qa-and-performance).
- The "Design Intelligence" skill and "Playbook" named in the brief do not exist on this PC.
- Screenshots: Playwright (`playwright-core`, installed in a scratch folder, not the project) driving the installed Microsoft Edge. Map tiles render in these.
- Owner pages need a session, so they were captured in the built-in browser where the user is signed in (`.jpg` files).

## 1. Screens and flows inspected

| Area | Routes / states |
|---|---|
| Landing | `/` at 1920, 1440, 1280, 768, 390, 375; full-page at 1440 and 390 |
| Finder | `/find` closed, panel open, budget menu open, empty result (`?max=1000&km=1`), map view 375, list 390, tablet 768 |
| Property details | details dialog (inside `/find`), full-screen photo viewer |
| Content | `/how-it-works`, `/owners`, `/about`, `/credits`, `/saved` (empty) |
| Auth | `/sign-in` default, `/sign-in` with error, `/sign-up?role=owner`, at 1440, 390 and 375 |
| Owner portal | `/owner/dashboard`, `/owner/properties`, `/owner/properties/[id]` (add-room form), `/owner/rooms`, at 1440 and 390 |

Not implemented, so not audited: inquiries, tenants, billing, reports and settings (listed as "Soon" in the owner nav); a standalone property page (details is a dialog); a signed-in account menu (the header shows "Account").

## 2. Screenshots

- Before: `docs/web/screenshots/audit/before/` (21 PNG + 3 JPG)
- After: `docs/web/screenshots/audit/after/` (28 PNG + 3 JPG)
- Earlier pass: `docs/web/screenshots/redesign/`

## 3. Problems found (ranked by user impact)

| # | Severity | Page | Problem | Evidence |
|---|---|---|---|---|
| 1 | **High** | Owner property page, phone | Both panels overflowed the screen: "Add a room" was cut off at the right edge. The rooms table's 560 px minimum width stretched an unbounded grid track | `before/owner-property-390x844.jpg` |
| 2 | **High** | Sign in / sign up | Generic white card on a texture, black button. Errors appeared in one box under the form, not next to the field that failed, and the field was not marked invalid | `before/sign-in-error-1440x900.png` |
| 3 | Medium | Owner add-room form | The three room types were squeezed into 130 px columns, so labels wrapped word by word ("Single / room / 1 bed, one / tenant") | `before/owner-property-1440x900.jpg` |
| 4 | Medium | Owner dashboard | Six equal stat boxes, no focal point. Bed occupancy, the number an owner checks first, had the same weight as "Properties: 1" | `before/owner-dashboard-1440x900.jpg` |
| 5 | Medium | How It Works | A plain text document with small circle numerals; weaker than the same story on the landing page, no next step, no footer | `before/how-1440x900.png` |
| 6 | Medium | Finder, budget menu | Two "selected" styles: active filter chips used the Clay tint, but the selected preset inside the menu was a black pill | `before/finder-filter-open-1440x900.png` |
| 7 | Medium | Finder, empty result | A card inside a card: a textured inner box with its own border inside the white floating panel | `before/finder-empty-1440x900.png` |
| 8 | Low | Details dialog | The primary action "Contact owner" was black, while every other primary action is Fired Clay | `before/details-dialog-1440x900.png` |
| 9 | Low | Finder card strip | Titles cut off after one line ("Bedspace near the UM Ma…"), hiding the information needed to choose | `before/finder-open-1280x800.png` |
| 10 | Low | About, Credits | No footer: dead ends | `before/about-1440x900.png` |
| 11 | Low | How It Works (found by axe) | Heading jumped h1 to h3 | axe `heading-order` |

## 4. Scores (1 to 10, before → after)

These are qualitative judgements from the screenshots, not measurements.

| Page | Hierarchy | Type | Colour | Spacing | Consistency | Originality | Readability | Responsive | A11y | Polish |
|---|---|---|---|---|---|---|---|---|---|---|
| Landing | 8 → 8 | 8 → 8 | 8 → 8 | 8 → 8 | 7 → 8 | 8 → 8 | 8 → 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| Finder | 7 → 8 | 7 → 7 | 6 → 8 | 7 → 7 | 6 → 8 | 7 → 7 | 6 → 7 | 7 → 7 | 7 → 7 | 7 → 8 |
| Details dialog | 7 → 7 | 7 → 7 | 6 → 8 | 7 → 7 | 6 → 8 | 6 → 6 | 8 → 8 | 7 → 7 | 8 → 8 | 7 → 7 |
| Auth | 5 → 8 | 6 → 8 | 5 → 8 | 6 → 8 | 5 → 8 | 3 → 7 | 7 → 8 | 7 → 8 | 6 → 9 | 5 → 8 |
| How It Works | 5 → 8 | 6 → 8 | 6 → 8 | 6 → 8 | 4 → 8 | 3 → 7 | 7 → 8 | 7 → 8 | 7 → 9 | 4 → 8 |
| Owner dashboard | 4 → 8 | 7 → 8 | 7 → 8 | 6 → 7 | 7 → 8 | 4 → 7 | 7 → 8 | 7 → 7 | 8 → 8 | 5 → 8 |
| Owner property | 6 → 8 | 7 → 7 | 7 → 8 | 5 → 8 | 7 → 8 | 5 → 6 | 5 → 8 | 2 → 8 | 7 → 8 | 5 → 8 |

Three biggest remaining problems per area:
- **Landing:** hero photos are editorial, not BoardEase rooms; the "Explore nearby" map is a drawing; no real testimonials (correctly, none exist yet).
- **Finder:** a pin can slide under the floating filter chips after the map moves; "Demo" badges repeat on every card; the filter chips are rounded pills, the one place pills remain.
- **Owner portal:** no edit or delete for properties and rooms; five modules are still "Soon"; the bed bar shows nothing until tenants exist.

## 5. Changes implemented

**Foundations and components**
- One "selected" style: the Clay tint (`clay-soft`) with Clay text and a ring, for filter chips and menu presets.
- One primary action colour: Fired Clay for sign in, sign up, Contact owner, Show list, and the empty-state "widen" action. Deep Ink stays the secondary dark button.
- Auth inputs: one input style, a hover ring, a Clay focus ring, and a destructive ring when invalid.
- Content pages share the footer.

**Auth**
- Split layout: the form on Porcelain, with a Familjen 40 px title. On desktop, a photo panel sits beside it with a Deep Ink scrim, a Clay rule and a caption ("Rooms near where you study or work, with the rent up front."). The photo is the spare Unsplash image from the manifest.
- Errors per field: the server returns which field failed. The field gets `aria-invalid`, an error line linked by `aria-describedby`, and focus. General errors (wrong password) stay in the alert box.
- The role cards (renter / owner) use the Clay selected style.

**How It Works**: rebuilt from the landing page's journey component, with Familjen Clay numerals. A "What stays private" section, the Deep Ink closing call to action and the footer follow. One daylight background runs behind the title and steps, so there is no seam. Heading levels are fixed.

**Finder**
- Empty state: a single surface in the panel, with a Familjen heading and a Clay "widen" action.
- Card titles wrap to two lines instead of being cut off.
- The selected budget preset uses the Clay tint.
- Details dialog: "Contact owner" is Fired Clay.

**Owner portal**
- Phone overflow fixed: grid tracks use `minmax(0,1fr)`, and children get `min-w-0`.
- Room type: full-width option rows (radio, label, hint on one line), with a Clay focus ring.
- Dashboard: a focal "Beds" card (a 56 px occupied figure, free beds in garden-ink, an occupied/free bar with legend and percentage). Properties, rooms and new inquiries are secondary figures. All values come from the database, as before.

## 6. Behaviour preserved (re-verified)

- Owner-only access, cross-owner protection (another owner's property shows not-found content, with no data), and the 2–3 bed limit for shared rooms ("A shared room has 2 or 3 beds.", nothing saved).
- Per-bed availability counts.
- `/?max=4000&km=1&view=map` → 308 to `/find?max=4000&km=1&view=map`.
- Note: a not-found property page returns HTTP 200 with not-found content. This is Next.js streaming behaviour, and no data is leaked.

## 7. Responsive

- **Checked:**
  - Landing at 6 sizes, plus full-page at 1440 and 390.
  - Finder at 1920, 1440, 1280, 768, 390 and 375 (map view).
  - Auth at 1440, 390 and 375.
  - Owner property page at 390: page width 390, panels end at 374, no overflow.
- **Fixed:** the owner phone overflow (problem 1).

## 8. Accessibility

- **axe-core 4.10** (WCAG 2.0 / 2.1 / 2.2 A and AA plus best practice): 15 routes × 2 widths = 30 runs.
  - **Result:** 0 violations, except one situational `target-size` on `/find` with the panel open (a pin under the floating filter chips after the map moved). The heading-order finding on How It Works was fixed and re-checked clean.
- **Manual checks:**
  - Sign-in by keyboard: Enter submits; the invalid field is marked, described and focused; the Clay focus ring shows (5:1 on Porcelain).
  - The rooms table on phones is a focusable region (from the earlier pass).
- **Contrast:** garden-ink #3D6450 is used for green text; Fired Clay is not used as text on Deep Ink.
- **Limits:** zero automated findings does not mean full accessibility. Screen-reader passes (NVDA, VoiceOver) and real-device touch testing were not done.

## 9. Tests and actual results

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint src` | 0 problems |
| `vitest run` | 1 file, **14 / 14 passed** (billing rules) |
| `next build` | compiled; 19 / 19 pages generated |
| Browser: shared room with 4 beds | rejected, nothing saved |
| Browser: unknown property id | not-found content, no room table, no form |
| axe | see section 8 |

## 10. Remaining limitations

- Pins can sit under the floating filter chips after the map moves (`target-size`).
- A signed-in user visiting `/sign-in` still sees the form; it should redirect to the account page.
- No edit or delete for properties and rooms; inquiries, tenants, billing, reports and settings are not built.
- No owner photo upload yet (needs object storage), so the finder still uses demo listings with Wikimedia stand-in photos.
- The bed bar on the dashboard is empty until tenant records exist.
- Owner-page screenshots are browser-pane captures (`.jpg`), because headless capture cannot carry the user's session.
