# ApplyFlow × Sprout AutoApply — parity roadmap

**Updated:** 5 October 2026  
**Product contract:** JobMap prepares and tracks applications in-product, then uses a verified partner route, its companion extension, or a transparent manual fallback. It does not bypass CAPTCHA, credentials, legal attestations, or employer access controls.

## Where we are

ApplyFlow is approximately **35% of full Sprout AutoApply parity** and **50% of manual-review parity**. The extension handoff, safe-field adapters, queue, and tracker exist. What remains is verified execution: tailored documents, job-specific answer transfer, confirmed delivery, and reliable operations.

| Capability | Current state | Parity |
| --- | --- | ---: |
| Discovery, swipe, eligibility, and source trust | Strong core journey | 70% |
| Application pack and review | CV selection and editable pack; no tailored resume generation | 50% |
| Employer-question review | Greenhouse questions are shown; answers are not yet transferred to the form | 35% |
| Portal fill | Greenhouse, Stripe, Lever, and Ashby paths exist; no live acceptance proof | 30% |
| Submission and receipt | No proven end-to-end submission route | 10% |
| Tracker and follow-up | Local/cloud tracker and evidence capture work; no inbox-driven updates | 55% |
| Execution security and operations | Expiry/revocation exist; tokens and adapter verification need hardening | 25% |

## Definition of parity

For a supported portal, a user can choose Manual Review or Submit-after-approval; JobMap creates editable, job-tailored documents; obtains only the answers the user approves; completes the supported portal route; receives a verifiable delivery outcome; and records a durable, timestamped application timeline. "Supported" means tested and monitored—never a claim that every employer form can be automated.

## Delivery plan

### P0 — Make the existing Greenhouse bridge trustworthy

**Goal:** A safe browser handoff ends in the right queue state and is proven in a real browser.

- [x] Open/focus the employer page from a user-approved handoff.
- [x] Fill safe allowlisted fields and return a typed receipt.
- [x] Treat CAPTCHA, login/MFA, and unapproved required questions as `needs_user`, not terminal failure.
- [x] Add a `filling` acknowledgement and preserve the full event timeline.
- [ ] Test the loaded extension against a controlled Greenhouse fixture and one monitored real form.
- [ ] Add retry only for retryable failures; keep pack, CV selection, and audit history intact.

**Exit:** JobMap records `queued → filling → needs_user` after a real Greenhouse form is safely prefilled, with screenshot/receipt evidence and repeatable browser coverage.

### P1 — Make the pack match the job

**Goal:** Approval covers exactly what will be used on the employer form.

- [ ] Carry approved text/select/boolean answers from the Greenhouse question review into the handoff bundle.
- [ ] Map only explicitly approved, non-sensitive answers to the live form; keep legal, demographic, compensation, work-authorization, and file fields user-controlled.
- [ ] Store question schema, answers, approvals, and adapter version in the application audit record.
- [ ] Generate editable, versioned, job-tailored resumes and cover letters with provenance for every claim.

**Exit:** The review screen and employer form agree field-for-field, and unsupported fields are clearly handed back to the user.

### P2 — Make submission honest and secure

**Goal:** No application is marked submitted without proof.

- [ ] Replace browser-held signing material with server-issued, one-time, short-lived, revocable handoff tokens.
- [ ] Add idempotency keys and a server-side execution/audit endpoint.
- [ ] Support direct submission only with an authorized employer/ATS API, a required CV attachment flow, and a verifiable confirmation identifier.
- [ ] Record `submitted` only from a confirmed receipt; otherwise return `needs_user` or `manual_fallback`.

**Exit:** One supported route has an independently tested confirmation receipt and durable audit trail.

### P3 — Expand portals by evidence, not host permissions

**Goal:** Grow coverage without turning the extension into a generic scraper.

- [ ] Certify Greenhouse first, then Lever and Ashby.
- [ ] Add fixtures, adapter contract tests, health checks, and a kill switch per portal.
- [ ] Add SmartRecruiters and Workday only after the same exit criteria pass.
- [ ] Publish the capability, fields supported, last health check, and fallback before a user starts a pack.

**Exit:** Each enabled host has passing form fixtures, an observed live test, telemetry, and an immediate disable path.

### P4 — Close the Sprout experience gap

**Goal:** Make the resulting application journey competitive, not merely functional.

- [ ] Multiple professional profiles, resumes, and saved searches.
- [ ] Import an external job URL into ApplyFlow.
- [ ] Optional manual-review versus submit-after-approval preference for proven integrations only.
- [ ] Email/inbox evidence sync and status reconciliation with explicit consent.
- [ ] Outcome metrics: fill success, manual-fallback rate, receipt rate, and adapter health.

**Exit:** A user can discover or import a role, review a tailored application, use a verified route, and see the resulting lifecycle in one timeline.

## Guardrails

- Never iframe or reverse-proxy employer portals.
- Never store employer credentials or bypass CAPTCHA, MFA, access controls, or legal attestations.
- Never silently upload a CV or submit sensitive answers.
- Never report `Applied` without a verifiable employer receipt or explicit user confirmation.
- Keep unsupported portals useful through a preserved pack and manual fallback.

## Release gates

Before a parity milestone is declared complete:

1. Lint, build, unit/smoke, extension fixture, and browser tests pass from a clean install.
2. The portal-specific live acceptance test passes and its adapter health is current.
3. The application timeline has a durable receipt or explicit user confirmation.
4. A failed path preserves the pack and offers the correct recovery action.
5. Security review confirms least-privilege hosts, short-lived tokens, revocation, and no CV/credential leakage.
