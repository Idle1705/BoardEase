# BoardEase web design system

Tokens live in `web/src/app/globals.css`. This file gives the reasons for them, so new screens stay consistent.

## Principles

1. **The map and the room photos are the interface.** Chrome stays white, grey and thin, so photographs and prices carry the page.
2. **One accent, used for meaning.** Davao green (`brand`) marks the search centre, focus rings, the active filter and the main action. It is never used as decoration.
3. **Depth comes from shadow and hairlines, not colour.** Panels sit on white with a 1px 8% black hairline. Floating controls over the map get `shadow-md`.
4. **Honest data.** Demo listings always show a `Demo` badge, and the page has a demo notice. Never show invented ratings, availability, verification or result counts.
5. **Motion answers the user.** Hover, press, select and open get motion. Nothing moves on its own, and nothing is tied to scrolling over the map.

## Colour

| Token | Value | Use |
|---|---|---|
| `ink` | `#1d1d1f` | Text, the selected map marker, primary buttons |
| `ink-2` | `#424245` | Secondary text |
| `subtle` | `#6e6e73` | Meta text (meets 4.5:1 on white) |
| `surface` | `#f5f5f7` | Page wells, chips, image placeholders |
| `surface-2` | `#ebebee` | Pressed chips, skeletons |
| `hairline` | `rgb(0 0 0 / .08)` | Card and panel borders |
| `brand` | `#0f6b52` | Accent, see principle 2 |
| `brand-soft` | `#e7f2ee` | Active filter chip background |
| `warn` | `#8a5a00` | Demo notice text |

No gradients, glows or violet. Dark mode is not designed yet; the app renders light only.

## Type

Geist (OFL licence, served by `next/font`). One family; hierarchy comes from size and weight.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `text-caption` | 12 / 16 | 500 | Badges, map attribution |
| `text-footnote` | 13 / 18 | 400-500 | Meta: distance, type, amenities |
| `text-body` | 15 / 22 | 400 | Descriptions, controls |
| `text-callout` | 17 / 24 | 600 | Card titles, prices on cards |
| `text-title3` | 20 / 26 | 600 | Section headings in panels |
| `text-title2` | 24 / 30 | 600 | Featured listing title |
| `text-title1` | 30 / 36 | 600 | Page titles on content pages |

Prices use `tabular-nums`. Sentence case everywhere. No all-caps labels, no eyebrow labels over headings.

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
| Map marker hover / select | Lift and scale, ink fill on select | 180 ms, `ease-spring` |
| Selected listing swap | GSAP: photo crossfade, text rises 8px | 320 ms |
| Gallery next / previous | GSAP slide of 24px with fade | 280 ms |
| Favourite | Heart pop keyframe | 360 ms |
| Popovers, sheets, dialogs | Base UI / shadcn defaults | 100-200 ms |

`prefers-reduced-motion: reduce` turns every transition and animation to 1 ms, and the GSAP code checks the same media query and skips its tweens. GSAP tweens are killed on unmount (`gsap.context().revert()`).

## Breakpoints

| Name | Width | Layout |
|---|---|---|
| Phone | < 768 | Map or list, switched by a floating segmented control. Filters in a bottom sheet. |
| Tablet | 768 - 1023 | Same switch; the list shows two columns of cards. |
| Desktop | >= 1024 | Split: map left half, discovery panel right half. |

## Components

- Built on shadcn/ui (Base UI primitives): Button, Popover, Slider, DropdownMenu, Dialog, Sheet, Sonner.
- Map: MapLibre GL JS with OpenFreeMap's Positron style. HTML price markers so they stay sharp and accessible (each is a `button` with a label).
- Icons: lucide-react, 1.75 stroke, 16-18px.
- Photos: `next/image`, WebP at 500/960/1280 widths, `object-cover`, grey `surface` placeholder.

## Copy

- Buttons are a verb and an object: "View details", "Search this area", "Save listing".
- Prices: `₱4,500 / month`. Distances: `1.2 km away`.
- Errors say what happened and what to do next. Empty states offer the next action (widen the radius, raise the budget).
