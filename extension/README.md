# JobMap ApplyFlow Bridge

This Manifest V3 proof of concept receives a user-triggered, short-lived ApplyFlow bundle from JobMap and fills only allowlisted safe fields on the active employer form.

## Install locally

Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension/` directory. Reload the employer application page after installation.

## Supported handoff

The JobMap page sends a `JOBMAP_AUTOFILL_HANDOFF` window message only after the user has saved an Application Pack and selects **Send to extension**. The production bridge is injected only on approved Greenhouse routes (`boards.greenhouse.io`, `job-boards.greenhouse.io`, and Stripe’s `stripe.com/jobs` employer route); other sources remain guided/manual. The content script requires a matching JobMap origin, job identifier, bundle version, and expiry, and fills only full name, email, phone, target role, skills, LinkedIn, and portfolio fields.

CAPTCHA, login, MFA, payment, identity verification, legal attestations, sensitive questions, and unknown fields are never filled by this proof of concept. The extension stores only the latest short-lived result in `chrome.storage.session` for troubleshooting and exposes a clear action in its popup.

This is not an auto-submit system. The user remains responsible for employer authentication, blocked questions, final review, and submission. The extension does not receive Supabase credentials or private CV bytes.

## Production hardening status

The bridge now has an explicit Greenhouse domain allow-list, narrow content-script matches, origin/job/expiry validation, and no form submission capability. Before extension-store distribution and multi-portal support, JobMap still needs server-issued signed handoff tokens, revocation, adapter tests for each additional portal, and a complete tracker receipt returned from supported submission adapters.
