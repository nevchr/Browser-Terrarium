# Browser Terrarium

Browser Terrarium is a Chrome/Chromium extension that turns local browsing activity into a calm, evolving botanical diorama. Each hostname becomes one deterministically generated plant. Return visits grow it; approximate focused time adds maturity; and long-quiet plants rest until a later visit helps them recover.

There is no account, backend, telemetry, advertising, remote classification, or paid API.

## How it works

```text
Chrome history event
→ normalize to a hostname
→ local site record
→ deterministic plant seed
→ growth, health, and species rules
→ Canvas terrarium
```

- A stable hash of the normalized hostname produces the plant seed.
- Visit count and approximate active time contribute to growth with logarithmic, diminishing returns.
- The last-visited timestamp derives health at render time. Plants are never permanently killed.
- Category zones and seeded offsets produce stable organic placement.
- Daily activity is retained for the most recent 120 local days so the popup and timeline emphasis can be computed without a backend.

## Privacy

Browser Terrarium stores its data in `chrome.storage.local`.

Browsing data is not uploaded or sold. There is no analytics service or cloud backend, and the extension has no host permissions. It does not inject a content script, read page content, inspect forms, use cookies, or store full URL paths. Page-title storage is off by default.

Export creates a JSON file containing only Browser Terrarium's own local records and settings. Reset deletes only the extension's keys; it does **not** clear Chrome history.

## Permissions

| Permission | Why it is used |
| --- | --- |
| `storage` | Persist plant records, local settings, and onboarding state. |
| `tabs` | Identify the active web tab and pause/resume approximate active-time tracking when tabs change. |
| `alarms` | Flush active-time estimates about every 30 seconds so a service-worker suspension loses less data. |
| `history` (optional) | Receive newly visited pages and turn their normalized hostnames into plants. The onboarding page explains this before Chrome asks for access. |

Only `http:` and `https:` pages are eligible. Browser pages such as `chrome://`, `edge://`, `about:`, extension pages, and local files are ignored.

## Project structure

```text
src/
├── background/       MV3 activity tracking service worker
├── dashboard/        React dashboard, controls, and Canvas renderer
├── onboarding/       Permission-first introduction
├── popup/            Toolbar summary and current plant
└── shared/           models, storage, deterministic rules, demo data
tests/                deterministic and import validation tests
public/manifest.json  Manifest V3 configuration
```

## Development

Prerequisites: Node.js 20.19 or newer and npm.

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run dev` runs the Vite web preview for UI development. Chrome extension APIs are available only when the built extension is loaded in Chrome.

To build a package with the development-data controls visible:

```bash
npm run build:demo
```

That mode exposes **Grow sample garden**, which creates 44 deterministic records spanning current, quiet, and dormant plants. It does not read or alter Chrome history. A normal `npm run build` hides this control.

## Load unpacked in Chrome

1. Run `npm run build` (or `npm run build:demo`).
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose this project's `dist` folder.
6. Read the onboarding explanation and choose whether to grant optional history access.
7. Visit normal web pages, then use the toolbar popup to open the terrarium.

After source changes, rebuild and press the extension's **Reload** button on `chrome://extensions`.

## Tracking details

The history listener records the visit timestamp and normalized hostname. Active time is deliberately described as an estimate: it is accumulated only while a normal web tab is active and a Chrome window is focused, then flushed on tab/URL/window changes and periodically through `chrome.alarms`. Each flush is capped to avoid counting a long computer sleep as browsing time.

Common presentation subdomains such as `www.` and `m.` are folded into the registrable-looking domain. A small allowlist preserves meaningful services such as `docs.google.com` and `music.youtube.com`. This is intentionally maintainable rather than a complete public-suffix implementation.

## Available features

- Full-page responsive glass terrarium with rooted soil placement, switchable 3D/2D views, and lightweight motion
- A short, reduced-motion-aware unfurl animation for plants that changed between dashboard visits
- Hover inspection, click details, keyboard plant navigation, and domain search
- Today, 7-day, 30-day, and all-time emphasis filters
- Local statistics and current-site popup
- Motion, particles, seasonal-light, title-storage, and tracking controls
- Safe versioned JSON export/import
- Confirmed local reset that leaves browser history untouched
- Deterministic development garden and automated logic tests
- Reduced-motion support and non-colour health cues (posture, fullness, glow, and labels)

## Known limitations

- Active time is an approximation, not a stopwatch. Browser shutdown can still lose the most recent unflushed interval.
- The lightweight domain normalizer covers common suffixes and selected meaningful subdomains, not every public suffix in the world.
- Chrome may suspend the MV3 service worker between events; timestamp-derived plant health does not require continuous background execution.
- Dense gardens remain renderable, but individual hover targets naturally become smaller as the terrarium approaches the 2,000-domain target.
- Chrome/Chromium is the V1 target. Firefox, Safari, sync, accounts, notifications, and store submission are intentionally out of scope.

## Build output

`npm run build` recreates `dist/` with the manifest, HTML entry pages, service worker, and bundled local assets. No runtime network request is required by Browser Terrarium.
