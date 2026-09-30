# Browser Terrarium Privacy Policy

**Effective date:** September 22, 2026  
**Last updated:** September 22, 2026

Browser Terrarium is a Chrome/Chromium browser extension operated by Chris Neville. This policy explains what information the extension handles, why it handles it, and the controls available to you.

## Summary

Browser Terrarium turns the websites you visit into a visual terrarium. Its data processing happens locally in your browser. Browser Terrarium has no user accounts, cloud backend, analytics, advertising, or tracking service. It does not send extension data to the developer or to third parties.

## Information handled by the extension

To provide its core functionality, Browser Terrarium may handle and store:

- the hostname of an eligible HTTP or HTTPS page, such as `example.com`;
- the page title only if you enable the optional **Store page titles** setting, which is off by default;
- first-visited and last-visited timestamps;
- visit counts and recent daily visit activity;
- an estimate of how long a normal web tab is active while a Chrome window is focused;
- locally derived values such as plant type, growth, category, layout seed, and terrarium statistics;
- extension settings, onboarding state, and permission state; and
- terrarium data contained in a JSON file that you deliberately choose to import.

Browser Terrarium does not store full URL paths, query strings, page bodies, form fields, cookies, passwords, authentication credentials, payment information, health information, personal communications, or precise location.

## How the information is used

The information is used only to provide Browser Terrarium's single purpose: creating and displaying a private visual terrarium based on local browsing activity. It is used to create one plant per normalized hostname, update plant growth, calculate local activity totals, support time-range filters and search, and remember your settings.

The extension does not use this information for advertising, profiling across services, creditworthiness, lending, or any purpose unrelated to its terrarium functionality.

## Permissions

Browser Terrarium uses the following Chrome permissions:

- **Storage:** saves terrarium data and settings in Chrome's local extension storage.
- **Tabs:** reads the active tab's URL so it can normalize the hostname and estimate active time while a normal web tab is active and the Chrome window is focused.
- **Alarms:** periodically saves approximate focused-time totals despite Manifest V3 service-worker suspension.
- **History (optional):** after an explanation and your explicit approval, listens for newly visited pages so hostnames can become or grow plants. You can decline or later revoke this permission.

Browser Terrarium does not request access to all website contents through host permissions and does not inject content scripts into pages.

## Storage and transmission

Extension data is stored in `chrome.storage.local` on your device. Recent per-day activity is retained for up to 120 days; cumulative site records and settings remain until you reset the terrarium, remove them through an imported data set, or Chrome removes the extension's storage.

When you use the export feature, Browser Terrarium creates a JSON file that is saved wherever your browser places downloads. That exported file is under your control and is no longer managed by the extension.

Browser Terrarium does not transmit extension data to the developer, a remote server, or any third party. It does not sell, rent, share, or transfer extension data.

## Your choices and controls

You can:

- decline the optional history permission during onboarding;
- disable new-site tracking or approximate active-time tracking in Settings;
- keep page-title storage disabled, as it is by default;
- revoke the history permission through Chrome's extension controls;
- export a local copy of your terrarium data;
- replace local data by importing a compatible JSON file; or
- erase Browser Terrarium's stored data with the reset control.

If history access is declined or revoked, Browser Terrarium stops using Chrome's history events to create or update plants. Existing local data remains until you reset it or Chrome removes the extension's storage.

## Data security

Keeping processing local removes the need to transmit terrarium data over the internet. Data stored by the extension is still subject to the security of your device, operating system, Chrome profile, and any exported files you create. No storage system can be guaranteed completely secure.

## Children

Browser Terrarium is not directed to children under 13, does not offer accounts, and does not knowingly collect personal information from children.

## Chrome Web Store Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes to this policy

This policy may be updated if Browser Terrarium's features or data practices change. The effective date and last-updated date at the top of this page will be revised when changes are made. Material changes will be reflected in the extension's disclosures before an affected version is published.

## Contact

Questions about this policy or Browser Terrarium's privacy practices can be sent to:

**Email:** chris@chrisneville.ca

