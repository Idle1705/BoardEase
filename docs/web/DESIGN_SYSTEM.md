# BoardEase web design system

Tokens live in `web/src/app/globals.css`. This file gives the reasons for them, so new screens stay consistent.

## Principles

1. **The map and the room photos are the interface.** Chrome stays white, grey and thin, so photographs and prices carry the page.
2. **One accent, used for meaning.** Davao green (`brand`) marks the search centre, focus rings, the active filter and the main action. It is never used as decoration.
3. **Depth comes from shadow and hairlines, not colour.** Panels sit on white with a 1px 8% black hairline. Floating controls over the map get `shadow-md`.
4. **Honest data.** Demo listings always show a `Demo` badge, and the page has a demo notice. Never show invented ratings, availability, verification or result counts.
5. **Motion answers the user.** Hover, press, select and open get motion. Nothing moves on its own, and nothing is tied to scrolling over the map.

## Colour (locked brand, 2026-11-11)

These five colours are final. Tokens live in `web/src/app/globals.css` (`--be-*`, Tailwind `clay`, `porcelain`, `limestone`, `garden`, `ink`).

| Name | Hex | Tailwind | Use | Contrast |
|---|---|---|---|---|
| Fired Clay | `#B44630` | `clay` | Main actions, active nav rule, selected pin and card, focus ring | 5.4:1 on white, 5.0:1 on Porcelain. **Never as text on Deep Ink** (2.7:1) |
| Deep Ink | `#202A28` | `ink` | Headlines, body text, secondary dark buttons, final CTA section | 14.8:1 on white |
| Warm Porcelain | `#F7F4EE` | `porcelain` (= `surface`) | Landing and content canvas, header on marketing pages | |
| Limestone | `#E7E1D7` | `limestone` (= `surface-2`) | Borders, dividers, owner pathway panel | |
| Garden Green | `#497760` | `garden` | Real availability ("2 of 3 free") and success only. Never "verified" | 5.1:1 on white |

Derived: `clay-hover #9A3A27`, `clay-soft #F6E9E4` (active chips, selection), `garden-soft #E8EFEA`, `ink-2 #46504D` (8.4:1), `subtle #5F6865` (5.8:1 white, 5.2:1 Porcelain), hairline `rgb(32 42 40 / .1)`. Shadows are tinted with Deep Ink, never pure black. `warn #8A5A00` and `destructive` are functional, not brand.

No purple, blue, teal or neon. No gradient text.

## Type (locked brand)

- **Familjen Grotesk** (`font-display`): brand headlines, landing hero, section titles, step numerals, owner page titles.
- **Hanken Grotesk** (`font-sans`, default): navigation, buttons, body, forms, filters, prices, map pins, tables.
- Both SIL OFL, self-hosted by `next/font` (one variable file each, `display: swap`). Geist removed.

| Token | Size | Use |
|---|---|---|
| `text-display` | clamp 44 to 76px, lh 1.02, -0.028em | Landing and owner hero only |
| `text-section` | clamp 30 to 44px, lh 1.08 | Section headings, content page titles |
| `text-lead` | 19 / 1.55 | Hero and intro paragraphs |
| `text-prose` | 17 / 1.6 | Marketing body |
| App scale (`caption` to `title1`) | 12 to 30px | Finder and owner portal, unchanged |

Prices use `tabular-nums`. Sentence case except the nav labels the brand brief names ("Looking for a Board?", "List Your Property", "How It Works").

## Spacing

4px base. Use 4, 8, 12, 16, 20, 24, 32, 48. Panel gutters are 24px on desktop and 16px on phones. Lists use 12px gaps; dense meta rows use 8px.

## Radius (by hierarchy)

| Token | px | Use |
|---|---|---|
| `rounded-sm` | 6 | Tags, the Demo badge |
| `rounded-md` | 10 | Inputs, buttons, menu items |
| `rounded-lg` | 14 | Listing cards, popovers |
| `rounded-xl` | 20 | Featured photo, panels, sheets |
| `rounded-full` | - | Map price markers, filter chips, icon buttons over photos |

## Shadow

- `shadow-sm`: cards at rest.
- `shadow-md`: floating controls on the map (search, chips, zoom).
- `shadow-lg`: popovers, dialogs, the mobile bottom sheet.

## Motion

| What | How | Time |
|---|---|---|
| Hover on buttons, chips, cards | CSS background or 2px lift | 150 ms, `ease-out-soft` |
| Card photo hover | Scale 1.03 inside its frame | 300 ms |
| Map marker hover / select | Lift and scale, ink fill on select, one ring ping | 180 ms, expo-out |
| Card picked (focal moment) | The card photo flies into the featured frame (GSAP), text rises 10px | 520 ms |
| Pin picked on the map | Featured photo resolves from an 8px blur | 500 ms |
| Filter change | GSAP Flip moves cards, new cards fade in (30 ms stagger), pins rise in or shrink away, count rolls | 400-500 ms |
| Distance change | The ring tweens to its new radius | 700 ms |
| Overlapping pins | Nudged apart after zoom so every price stays readable | instant |
| Gallery next / previous | GSAP slide of 24px with fade | 280 ms |
| Favourite | Heart pop keyframe | 360 ms |
| Popovers, sheets, dialogs | Base UI / shadcn defaults | 100-200 ms |

`prefers-reduced-motion: reduce` turns every transition and animation to 1 ms, and the GSAP code checks the same media query and skips its tweens. GSAP tweens are killed on unmount (`gsap.context().revert()`).

## Breakpoints

| Name | Width | Layout |
|---|---|---|
| Phone | < 768 | Map or list, switched by a floating segmented control. Filters in a bottom sheet. |
| Tablet | 768 - 1023 | Same switch; the list shows two columns of cards. |
| Desktop | >= 1024 | Full-width map. A floating listing panel (top-right, 640 px max) opens when a price is pressed and closes with ✕ or Esc. See "Floating listing panel" below. |

## Components

- Built on shadcn/ui (Base UI primitives): Button, Popover, Slider, DropdownMenu, Dialog, Sheet, Sonner.
- Map: MapLibre GL JS with OpenFreeMap's Positron style. HTML price markers so they stay sharp and accessible (each is a `button` with a label).
- Icons: lucide-react, 1.75 stroke, 16-18px.
- Photos: `next/image`, WebP at 500/960/1280 widths, `object-cover`, grey `surface` placeholder.

## Copy

- Buttons are a verb and an object: "View details", "Search this area", "Save listing".
- Prices: `₱4,500 / month`. Distances: `1.2 km away`.
- Errors say what happened and what to do next. Empty states offer the next action (widen the radius, raise the budget).

## Technique decisions (2026-11-11)

Chosen with the user's design knowledge base (`~/.claude/design-knowledge/motion-and-backgrounds.md`; source videos: "20 Ways to Make Beautiful AI Animations" and "22 Backgrounds to Make Designs Less Flat"). Numbers refer to that file.

| Technique | Where | Why it fits |
|---|---|---|
| Motion 1, 9: ease-out entrances, ease-in-out moves | Everywhere (`src/lib/motion.ts`) | Arrivals feel quick; moving objects read as the same object |
| Motion 2, 15: menus 180 ms in / 140 ms out | shadcn popover, dropdown, select; dialogs 200/150 ms | Was 100 ms both ways, which read as a jump |
| Motion 3: 30 ms stagger | New cards after a filter change | Reads as a list arriving |
| Motion 4: press to 0.97 | Buttons, chips, map controls, heart, form submit; cards 0.98 | Physical acknowledgement (replaced the 1px nudge) |
| Motion 5: knob stretch 12% | Budget and distance slider thumbs while dragging | Shows the knob is being moved |
| Motion 6: stagger as details settle | Featured listing text after a swap | Headline, then specs |
| Motion 7, 20: arc + shared element | Card photo flies on a curve into the featured frame (focal moment) | Continuity from the card you picked |
| Motion 8: pulse to confirm | Saved count in the header, plus heart pop and burst | A save visibly lands |
| Motion 10-12: popovers from the trigger at 0.95 | Base UI `--transform-origin` | Already correct |
| Motion 13: no bounce | Token `--ease-spring` is now expo-out | Everyday UI |
| Motion 16: overlap old and new | Gallery: outgoing photo stays under the incoming one, then fades | No blank frame |
| Motion 17: mask reveal | Phone and tablet Map/List switch: circle grows from the tapped tab | Shows where the new view came from |
| Motion 18: icon crossfade | Heart outline/filled, password eye | Icon swaps read as one icon changing |
| Background 13: contour lines | Map loading and error, empty results, log-in, sign-up, account (`public/textures/contours.svg`, `scripts/make-contours.mjs`) | The map's own vernacular; only on surfaces with no data |

Rejected:
- **Other backgrounds** (thermal, iridescent, fluted glass, halftone, grain, ASCII): fight the white Apple-style direction.
- **Blurred photos:** would hide listing photos people need to see.
- **Motion 19, rubber band:** native scroll already does it.
- **Motion 14:** nothing is tweened while held. Map drag and sliders follow the pointer.

Reduced motion keeps opacity and colour feedback and drops travel, scale, blur and masks. The press scale stays because it is tiny.

## Layout and QA pass (2026-11-11, design knowledge base v2)

Used `~/.claude/design-knowledge/` (`ux-principles.md`, `components.md`, `motion-principles.md`, `accessibility-checklist.md`). The user allowed layout changes that clearly improve the product.

| Change | Why |
|---|---|
| Desktop: horizontal card rail → 2-column grid under the featured listing | The rail showed about 2.5 of 7 listings and cut card bottoms at 900 px tall. A grid lets renters scan and compare every room with a normal scroll (Jakob's law: how map + list sites work), with no hidden sideways scroll and a straight Tab order |
| Sticky count + sort bar | Result count and sort stay visible while scrolling (system status) |
| Picking a card jumps the panel to the top; picking a pin scrolls it there | The featured listing is always visible after a choice; the photo flight still runs from the card |
| Search and filters come before the map in the DOM | Keyboard users reach search first instead of tabbing through every map pin |
| Map controls raised above the map credits | "Show my location" covered the credits toggle (axe `target-size`) |
| Landmark names: "Map and search", "Results" | Duplicate "Map" label with MapLibre's canvas (axe `landmark-unique`) |
| `ease-in` → `cubic-bezier(0.23, 1, 0.32, 1)` on leaving pins and the gallery fade; `transition-all` → named properties | Motion rules: no `ease-in` on UI, never `transition: all` |
| Gallery arrows always visible on touch tablets | They only appeared on hover, which touch screens don't have |

Kept: map left, featured listing upper right, white header, floating chips, ₱/month, all existing motion.

Rejected: sticky featured listing (would leave too little room for the grid), 3-column grid (cards too small at half of 1440 px), Lenis or scroll effects over the map.

Checked: 1440×900, 768×1024, 390×844 (list and map), axe-core 4.10 = 0 violations at 1440, Tab order, reduced motion path (this PC has it on), `tsc`, `eslint`, 14 unit tests. Full-motion photo flight from a grid card also checked (reduced motion forced off in the tab). Not checked this pass: slow-network loading state; docs screenshots not refreshed.

## Floating listing panel (2026-11-11, replaces the split layout and the in-panel card)

User direction: the whole right half should be closable; pressing a price on the map opens a floating card over the map, like the "Estates" reference shot (map behind, rounded white panel on the right with the room on top and a strip of cards below).

- Desktop map fills the screen under the header.
- Closed state: a small floating card top-right with the result count, "Press a price on the map to see the room", the demo note and a **Show list** button (opens the nearest listing). This keeps the list reachable without hunting pins, and keeps demo data honest.
- Pressing a pin (or Show list) opens the panel: 28 px radius, `shadow-xl`, `min(640px, 50vw − 24px)` wide, scrolls inside itself if the window is short.
  - Top: photo (4:5, left) beside title, address, distance, specs, description, price, View details and Contact.
  - Then count + sort, a horizontal strip of all results with arrow buttons, and the demo note.
- Picking a card in the strip swaps the room (the photo flies into the big frame). Picking another pin swaps it too.
- Close: ✕ at top-right or Esc. Panel leaves with a 180 ms fade + 16 px slide; enters with 320 ms fade + 24 px slide (fade only under reduced motion). Focus goes back to the pin that opened it, or to Show list.
- The map knows how much of it the panel covers (`rightInset`): the chosen pin is centred in the uncovered part, zoom and location buttons slide left of the panel, credits moved to bottom-left on desktop.
- Phone and tablet unchanged (Map/List switch, bottom strip on the map).

Checked at 1440×900 and 1024×768: pin open, Show list, strip card swap, ✕ and Esc close, Enter on a focused pin, focus return to the right pin, URL `?id=` open/clear, shared link opens the panel. axe-core: 1 situational `target-size` hit (a pin that sat under the floating filter chips after the map moved). Phone 390 map checked. Not checked: a real phone, slow network.


## Premium redesign (2026-11-11)

Full report: `docs/web/REDESIGN-2026-11.md`. Screenshots: `docs/web/screenshots/redesign/before` and `after`.

- Routes: landing at `/`, finder at `/find`. Old finder links (`/?max=4000&km=1&view=map`) get a 308 to `/find` with every parameter, in `src/proxy.ts`.
- Backgrounds: `.be-daylight` (Porcelain with a 7.5% Clay light top-right and 5% Garden shade bottom-left) behind the hero and intro only; `.be-drafting` 96px rule grid, masked, behind the hero photos only. The finder and owner portal get no decorative background.
- Motion: hero entrance is CSS only (`.be-enter`, `.be-settle`; 560 to 760ms, steps of about 100ms). Scroll reveal (`RevealRoot`) is visible by default and only hides blocks when motion is allowed; no scroll hijacking.
- Finder: layout kept (floating panel over a full map, Estates reference). Clay selected pin and card, visible photo count, full-screen photo viewer (keys, swipe, Esc returns focus).
- Owner portal: Dashboard, My Properties, Rooms & Availability are real and owner-scoped; other modules are listed as "Soon" and not linked.

## Motion Director pass (2026-11-12)

Audit with the `motion-director` skill (`~/.claude/skills/motion-director`, BoardEase spec in its `references/`). Ranked P0 (broken) to P3 (storytelling).

| P | Change | Tool | Files |
|---|---|---|---|
| P0 | One photo flight at a time: a new card pick finishes the previous flight, so rapid clicks never stack ghosts or leave the featured photo hidden | GSAP (existing) | `src/lib/motion.ts` |
| P1 | Save button holds its width and shows a spinner while saving (`aria-busy`) | CSS | `src/app/owner/forms.tsx` |
| P1 | After the server confirms a new property or room, that row scrolls into view with a short Fired Clay wash. A failed save highlights nothing | Web Animations API | `forms.tsx`, `actions.ts` (returns `newId` after insert), `ui.tsx`, `properties/page.tsx` (`data-row-id`) |
| P2 | Choice cards: one highlight slides to the chosen option (room kind, sign-up role) | Motion `layoutId`, `MotionConfig reducedMotion="user"` | `forms.tsx`, `(auth)/auth-forms.tsx` |
| P3 | How it works scroll story: a clay line draws down each journey and step numbers light up when reached. No pinning, nothing hidden | GSAP ScrollTrigger (scroller = `<main>`) | `components/landing/journey-progress.tsx`, `landing-page.tsx`, `globals.css` |

Rejected:
- **Hero changes:** the CSS entrance already meets the spec.
- **Animated dashboard or price numbers:** the spec bans them.
- **Parallax and pinned sections:** they confuse keyboard users.
- **Autoplay galleries.**
- **animejs:** it's in the working tree but redundant next to GSAP and Motion.

Reduced motion behaviour:
- **Journey:** shows all numbers in clay, with no line.
- **Choice highlights:** jump instead of slide.
- **Row highlight:** a colour fade only.
- **Photo flight:** skipped.

Tested in headless Edge (motion on and off) and the browser pane. The confirmed-save highlight was not run end to end, to avoid writing test rows into Neon.

## Landing scroll story (2026-11-12)

Persuade mode, so the landing page earns one authored scroll moment (Motion Director). All scroll-linked motion is GSAP ScrollTrigger, scrubbed to scroll, with `<main>` as the scroller.

| Scene | What happens | Files |
|---|---|---|
| **Focal: product story** (replaces the static map preview in "See what is near, and what it costs") | The drawn map stays on screen (CSS `position: sticky`, no pinning) while four chapters scroll past. Search pill and point, then the 3 km ring, then price pins (nearest first), then the budget chip with over-budget pins fading back and a real count, then the pick turning Fired Clay and its room card rising. The chapter being read is full strength, the others at 28% | `components/landing/story-section.tsx` |
| Hero depth | Photos drift up at different speeds as the hero leaves (−36, −64, −96 px). Text never moves | `components/landing/scroll-scenes.tsx` |
| Photo wipes ("Two ways") | Photos open from an inset frame and settle out of a 1.14 zoom | `scroll-scenes.tsx` |
| Closing section | Corridor photo eases out of a 1.18 zoom; the clay rule draws in | `scroll-scenes.tsx` |
| Section headings | Wipe up through a mask (clip-path) as they reveal | `globals.css` |
| How it works | Clay line and step numbers (earlier pass) | `journey-progress.tsx` |

Rules kept:
- **Finished-state markup:** the page loads in its finished state. Without JavaScript, or with reduced motion, the full map, all chapters, every photo and every heading show at once.
- **Phones:** the map sticks under the header at half the screen height, and the chapters scroll up under it. Markers sit in a band below the top controls.
- **Rejected:** Lenis smooth scrolling, pinned scroll-jacking, letter splitting, parallax on text, and decorative blobs.
- **Removed:** `nearby-preview.tsx` (replaced by the story; still in git history).

Tested in headless Edge at 1440×900 and 390×844 with motion on and off: progression at six scroll points, no horizontal overflow and no console errors.

## Visual critique (2026-11-12)

Scores, measured gates, ranked fixes and before/after notes: `docs/web/CRITIQUE-2026-11-12.md`. Fixed: account page next step and title, honest log-in copy, visible dialog close, owner getting-started checklist, owner nav grouping and phone tab labels, properties card height.
