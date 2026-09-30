# Chrome Web Store submission pack

Prepared for Browser Terrarium 1.0.0 on September 22, 2026.

This document is a copy-and-paste guide for the Chrome Web Store dashboard. It reflects the current production extension in this repository. Recheck the answers if the extension's permissions, data handling, or business model changes.

## 1. Developer account

Use these account details:

| Field | Recommended value |
| --- | --- |
| Publisher name | `Chris Neville` |
| Contact email | `chris@chrisneville.ca` |
| Account type | Individual, unless the extension is being published by a registered organization |
| Two-Step Verification | Enable before publishing |

Google charges a one-time developer registration fee. The current amount is shown during registration. The account email cannot later be changed, so confirm the Google account before paying.

A physical address is not needed for Browser Terrarium because the extension has no purchases or subscriptions. Do not add a phone number to the listing.

Official guidance: [Register a developer account](https://developer.chrome.com/docs/webstore/register), [Set up your account](https://developer.chrome.com/docs/webstore/set-up-account), and [Two-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification).

## 2. Package upload

| Field | Value |
| --- | --- |
| Name | `Browser Terrarium` |
| Version | `1.0.0` |
| Manifest version | `3` |
| Package | ZIP containing the contents of `dist`, not the `dist` directory itself |

Build and package the production version from the repository root:

```powershell
pnpm build
Compress-Archive -Path .\dist\* -DestinationPath .\Browser-Terrarium-1.0.0.zip -Force
```

Do not upload a build produced by `pnpm build:demo`. Demo mode is only for creating safe promotional screenshots and exposes sample-garden controls that do not belong in the store package.

Before uploading, open the ZIP and confirm that `manifest.json`, `dashboard.html`, `popup.html`, `onboarding.html`, the JavaScript bundles, and `icons/` are at its top level.

Official guidance: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/).

## 3. Store listing

### Product details

| Field | Copy-paste value |
| --- | --- |
| Language | `English` |
| Extension name | `Browser Terrarium` |
| Summary | `Turn the websites you visit into a private, evolving terrarium that grows locally in your browser.` |
| Category | `Workflow & Planning` |
| Mature content | `No` |

`Just for Fun` is a reasonable alternative category, but `Workflow & Planning` is the recommended choice because the extension turns browsing frequency and focused time into a personal activity visualization.

### Detailed description

```text
Browser Terrarium turns everyday browsing into a calm, evolving botanical diorama. Each visited hostname becomes a deterministic plant. Return visits and approximate focused time help it grow, while long-quiet plants simply rest until you return.

Everything stays on your device. There is no account, cloud backend, analytics, advertising, or sale of browsing data.

Features:
• A private terrarium generated from visited hostnames
• Stable plant species and layouts for familiar sites
• Growth shaped by visit frequency, recency, and approximate focused time
• Interactive 3D and clean 2D terrarium views
• Today, 7-day, 30-day, and all-time activity filters
• Local search, plant details, and garden statistics
• Optional page-title storage, off by default
• Local JSON export, import, and reset controls
• Reduced-motion support and keyboard navigation

Privacy by design:
Browser Terrarium requests optional history access only after explaining why it is needed. It stores normalized hostnames rather than full URL paths. Data is saved only in Chrome's local extension storage and is never uploaded or shared.
```

The summary is under the current 132-character limit. Keep the listing factual and do not add search-keyword lists, rankings, testimonials, or claims that are not demonstrated by the extension.

Official guidance: [Best practices for your store listing](https://developer.chrome.com/docs/webstore/best-listing) and [Chrome Web Store categories](https://developer.chrome.com/docs/webstore/best-practices).

### URLs

These URLs must be publicly accessible over HTTPS and must not require a login.

| Field | Value |
| --- | --- |
| Homepage URL | `[PUBLIC PRODUCT PAGE URL]` |
| Support URL | `[PUBLIC SUPPORT PAGE OR PUBLIC ISSUE TRACKER URL]` |
| Privacy policy URL | `[PUBLIC HTTPS URL FOR PRIVACY_POLICY.md]` |

The privacy policy URL is required because Browser Terrarium handles browsing activity, even though it processes and stores that data only on the user's device. A homepage and support URL are strongly recommended. The support page should offer `chris@chrisneville.ca` and should not list a phone number.

Do not submit the item until the privacy-policy URL is live and its text matches [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).

## 4. Graphic assets

### Required assets

| Asset | Requirement | Browser Terrarium status |
| --- | --- | --- |
| Store icon | 128x128 PNG | `public/icons/icon-128.png` exists. Before submission, consider revising it so the visible artwork is about 96x96 with approximately 16 px of transparent padding on each side, as Google recommends. |
| Small promotional tile | 440x280 PNG or JPEG | Must be created |
| Screenshots | At least 1 and no more than 5; 1280x800 or 640x400 | Must be captured; use 1280x800 |

Optional assets:

- Marquee promotional tile: 1400x560 PNG or JPEG.
- YouTube promotional video: add only if a polished demonstration is available.

Official specifications: [Supplying images for the Chrome Web Store](https://developer.chrome.com/docs/webstore/images).

### Recommended screenshot set

Use five 1280x800 images with no browser history, bookmarks, account details, or real browsing domains visible:

1. Full interactive 3D terrarium with a varied sample garden.
2. The same garden in 2D view with the time-range filters visible.
3. A selected plant with its local activity details open.
4. Settings showing the local-only controls, page-title storage off, export/import, and reset.
5. Toolbar popup showing today's activity and the current plant.

Use `pnpm build:demo` only to create fictional, privacy-safe sample data for screenshots. Do not use personal browsing history. Screenshots should show the actual extension UI, fill the frame, use square corners, and avoid extra marketing text that makes the product difficult to recognize.

### Promotional tile direction

For the 440x280 tile, show the Browser Terrarium icon and a glassy rectangular terrarium containing several distinct plants against the extension's dark green background. Keep text minimal or omit it. Do not shrink a screenshot into the tile.

## 5. Privacy tab

### Single purpose

```text
Browser Terrarium turns local browsing activity into a private, evolving visual terrarium. Visited hostnames become deterministic plants, and return visits plus approximate focused time influence growth. All processing and storage remain on the user's device.
```

### Permission justifications

Paste the matching explanation into each permission field.

#### `storage`

```text
Stores the user's terrarium records, privacy settings, onboarding state, visit totals, and recent daily activity locally in chrome.storage.local. This is required so the garden persists between browser sessions. The extension does not sync or upload this data.
```

#### `tabs`

```text
Reads the active tab's URL only to normalize its hostname and estimate active time while a normal web tab is active and the Chrome window is focused. It does not inject scripts, read page bodies, inspect forms, or store full URL paths.
```

#### `alarms`

```text
Runs a local 30-second flush while Chrome is active so approximate focused-time totals can be saved reliably despite Manifest V3 service-worker suspension. It performs no network requests.
```

#### Optional `history`

```text
After an in-product explanation and an explicit user action, listens for newly visited pages so each normalized hostname can become or grow one plant. Only the hostname, visit timing and counts, and, if the user enables the off-by-default option, the page title are retained locally. Full URL paths are not stored or transmitted.
```

#### Host permissions

```text
None requested.
```

### Remote code

Select: `No, I am not using remote code.`

Explanation, if the dashboard requests one:

```text
All executable JavaScript is bundled in the extension package. Browser Terrarium does not download or execute remote scripts, WebAssembly, or dynamically fetched code.
```

### Data-use disclosures

Local handling still counts as handling user data. Use these answers for the current build:

| Dashboard data type | Answer | Reason |
| --- | --- | --- |
| Personally identifiable information | No | No name, email, account identifier, address, or similar information is handled. |
| Health information | No | None handled. |
| Financial and payment information | No | None handled. |
| Authentication information | No | No passwords, credentials, security answers, or PINs are handled. |
| Personal communications | No | Messages, email, and chat content are not read. |
| Location | No | Location is not requested or inferred. |
| Web history / browsing activity | **Yes** | The extension handles normalized hostnames, visit timestamps/counts, recency, and recent daily activity. |
| User activity | **Yes** | The extension estimates how long an ordinary web tab is active while a Chrome window is focused. |
| Website content | **Yes** | If the user enables the off-by-default setting, the extension stores page titles. It never reads page bodies or form fields. |

For each disclosed type, use this purpose:

```text
App functionality — used only on the user's device to create, grow, filter, and display the user's terrarium and its local activity statistics.
```

Answer the transfer/use questions as follows:

| Question | Answer |
| --- | --- |
| Is data sold to third parties? | No |
| Is data transferred to third parties? | No |
| Is data used for advertising? | No |
| Is data used for analytics? | No |
| Is data used for creditworthiness or lending? | No |
| Is data used for a purpose unrelated to the extension's single purpose? | No |

Select all Limited Use certifications only after confirming they remain true for the uploaded build. They are true for the current 1.0.0 implementation.

The policy treats local processing and storage as handling user data. See [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Privacy tab fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), and [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

## 6. Distribution

| Field | Recommended value |
| --- | --- |
| Visibility | `Public` |
| Regions | `All regions` |
| In-app purchases | `No` |

Use `Private` only for an internal trusted-tester phase, or `Unlisted` if access should be limited to people with the link. Public, unlisted, and private items are all subject to review.

If this is the first public release, select deferred publishing. Once review approval arrives, inspect the approved listing and publish manually within the dashboard's stated window.

Official guidance: [Set up distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

## 7. Test instructions for the reviewer

No account, credentials, paid subscription, special hardware, or external service is required.

```text
1. Install Browser Terrarium and open the onboarding page.
2. Review the local-data explanation, click "Grow my terrarium," and approve the optional browsing-history permission. The extension also works if permission is declined, but no new plants are recorded until tracking is enabled.
3. Visit two ordinary HTTP or HTTPS websites.
4. Open the toolbar popup, then select "Open terrarium."
5. Confirm that one plant is shown per normalized hostname and that return visits update local counts.
6. Switch between the interactive 3D and 2D views. In 3D, drag to orbit and use the mouse wheel or controls to zoom.
7. Open Settings to verify that tracking and approximate active-time measurement can be disabled, page-title storage is off by default, and local data can be exported, imported, or reset.

No network connection is used for extension data, and no test account is needed. Data is stored only in chrome.storage.local. Full URL paths are not retained.
```

## 8. Submission-day checklist

- [ ] Developer contact email is verified and Two-Step Verification is enabled.
- [ ] The public privacy policy is live over HTTPS.
- [ ] The privacy policy, listing, onboarding disclosure, and dashboard answers say the same thing.
- [ ] Production package was built with `pnpm build`, not `pnpm build:demo`.
- [ ] ZIP opens with `manifest.json` at the top level.
- [ ] Version in the filename and `manifest.json` is `1.0.0`.
- [ ] 128x128 icon looks clear on light and dark backgrounds.
- [ ] 440x280 small promotional tile is uploaded.
- [ ] At least one 1280x800 screenshot is uploaded; five are recommended.
- [ ] Screenshots contain only fictional sample domains/data.
- [ ] Category is `Workflow & Planning`.
- [ ] Mature content is `No`.
- [ ] `storage`, `tabs`, `alarms`, and optional `history` are individually justified.
- [ ] Remote code is declared `No`.
- [ ] Web history, user activity, and website content are disclosed.
- [ ] No sale, transfer, advertising, analytics, or unrelated-use boxes are selected.
- [ ] Reviewer instructions are included.
- [ ] Visibility and regions are set deliberately.
- [ ] Deferred publishing is selected if a final inspection is desired before release.

## 9. Changes that require revisiting this pack

Update the store disclosure and privacy policy before publishing a build that adds any of the following:

- analytics, crash reporting, advertising, telemetry, or a backend;
- data sync or any transmission off-device;
- accounts, authentication, purchases, or subscriptions;
- content scripts, host permissions, clipboard access, downloads access, or new Chrome permissions;
- storage of full URLs, page bodies, form fields, or additional website content;
- sharing, sale, or third-party processing of extension data.

