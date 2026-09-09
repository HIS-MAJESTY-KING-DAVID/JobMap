# JobMap ApplyFlow Bridge

This Manifest V3 extension executes a user-triggered, short-lived ApplyFlow bundle: it opens the employer application page, fills only allowlisted safe fields, and posts a typed fill receipt back into JobMap's tracker. It is not an auto-submit system — the user reviews and submits the employer form.

## Install locally

Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension/` directory. Reload the employer application page after installation.

## How the handoff executes

1. **JobMap SPA** — after the user saves an approved pack and selects **Send to extension**, ApplyFlow posts a signed `JOBMAP_AUTOFILL_HANDOFF` window message with the bundle (fields, expiry, HMAC, `applyUrl`).
2. **`capture.js`** (injected only on JobMap origins) — forwards the message to the background service worker.
3. **`background.js`** — authenticates the sender against the approved JobMap origins, stores the bundle in `chrome.storage.session`, opens or focuses the employer `applyUrl` tab, waits for it to load, and sends `JOBMAP_FILL`. If the tab predates the extension install it injects the content scripts or reloads once, then reports a typed failure if the form never answers.
4. **`content.js`** (injected only on allowlisted employer hosts — Greenhouse boards and Stripe) — verifies the bundle HMAC and expiry, scans the live form, fills only safe fields, highlights what it touched, and sends a `JOBMAP_FILL_RESULT` receipt back to the worker.
5. **`background.js`** relays the receipt to the JobMap tab; `capture.js` reposts it into the SPA window, where ApplyFlow writes it into the application timeline (`queued → needs_user` or `failed` with a typed reason).

## Security model (split checks)

- **Authentication** comes from the JobMap origin: the bundle must be signed by an approved JobMap origin (`bundle.origin` allowlist) and the HMAC must verify against the session key inside the bundle. The key changes each page load, which prevents cross-session replay.
- **Authorization to fill** comes from this page's host: an adapter in `adapters.js` must match the page, otherwise nothing is written. The old requirement that `bundle.origin` equal the employer origin is gone — the employer form is filled *because* it is on the fill allowlist, not because it signed the bundle.
- Revocation (`JOBMAP_REVOKE`) clears the stored bundle everywhere and tells the employer tab to drop fill state, so a cancelled pack cannot be replayed.

## Fill rules

Only full name, first/last name, email, phone, LinkedIn, portfolio/website, and cover-letter body are ever written, and only when the user approved them in the pack. File inputs (the CV) are never touched — attaching the CV is a user action and no CV bytes travel through messages. CAPTCHA, login/MFA, payment, legal attestations, salary, sponsorship, work authorization, demographics, and unknown fields are skipped, highlighted for the user, and reported back as `rejectedFields` / `blockedRequired` with a typed `failureReason` (`captcha`, `auth`, `unexpected_field`, `layout_change`, `expired_job`, `network`, `extension_unreachable`, `revoked`).

The extension stores only the latest short-lived bundle and result in `chrome.storage.session` for troubleshooting and shows them in its popup. It does not receive Supabase credentials or private CV bytes.

## Production hardening status

Done: split origin/host checks, real tab opening, typed receipts back into the tracker, revocation, cover-letter fill, popup diagnostics. Remaining before store distribution and multi-portal support: server-issued short-lived handoff tokens (the HMAC prevents replay but not extraction by a party with session access), adapter tests and health for each additional portal, and verified-confirmation-id receipts from supported submit paths.