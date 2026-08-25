# JobMap ApplyFlow autofill engine

**Last updated:** 25 August 2026

## Purpose

The ApplyFlow autofill engine converts a verified JobMap profile, selected private CV, and user-confirmed answer memory into a reviewable field bundle. It is designed for Cameroon-based applicants applying to local and worldwide remote roles without silently inventing facts or submitting consequential answers.

## Ten-step workflow

| Step | Behavior | Safety boundary |
|---:|---|---|
| 1 | Select a job and an approved CV version | The user chooses the job and document; the default CV is only a starting suggestion. |
| 2 | Build a normalized field map | Employer labels are mapped to stable field IDs such as `email`, `phone`, or `workAuthorization`. |
| 3 | Classify every field | Fields are classified as safe profile, safe CV, generated draft, sensitive, legal, unknown, or blocked. |
| 4 | Resolve verified profile facts | Contact, links, target role, location, and other saved facts are proposed only when present. |
| 5 | Resolve CV/profile facts | Skills, education, experience, GPA, and certifications are used only when explicitly stored. |
| 6 | Generate editable drafts | Cover notes, summaries, and motivation responses are drafts with lower confidence and always require review. |
| 7 | Reuse confirmed answer memory | Authorization, sponsorship, salary, and similar answers can be suggested from confirmed memory. |
| 8 | Present the review state | Each field shows its source, status, confidence, and whether it is blocked or requires confirmation. |
| 9 | Create an expiring handoff bundle | Only approved safe fields enter the origin-bound bundle; it expires after ten minutes and contains no credentials. |
| 10 | Execute or pause | Approved APIs or the future extension may fill safe fields; CAPTCHA, login, legal, unknown, and blocked fields pause for the user. |

## Learning and eventual unassisted reuse

JobMap records a confirmed answer only after the user checks the remember option and saves the pack. A user may request unassisted reuse for a sensitive answer after the answer has been confirmed at least three times. The policy engine then marks that specific answer as eligible for unassisted reuse, but the field remains blocked if it is legal, unknown, CAPTCHA, credential, payment, identity-verification, or MFA related.

Unassisted reuse is **field-specific, user-enabled, source-backed, and revocable**. It does not mean unrestricted automatic application submission. A changed question label, changed employer context, expired memory, or missing source evidence returns the field to review. Final submission and legal attestations remain user actions.

## Source and status contract

Every suggestion includes a stable field ID, classification, source reference, confidence score, status, and reason. The statuses are `autofill`, `suggested`, `needs_input`, `blocked`, and `paused`. The generated bundle contains only fields with status `autofill`, plus the IDs that require review or are blocked. It carries the current JobMap origin, creation time, expiry time, job ID, and selected CV metadata.

The future browser extension must accept a bundle only from the matching JobMap origin, reject expired bundles, fill only listed safe fields, and return control to JobMap when a portal requires login, CAPTCHA, legal attestation, an unknown question, or any field outside the bundle. The extension must never receive the Supabase service-role key or unrestricted CV access.

## Current implementation

The deterministic field classifier, source-backed suggestion builder, review-state model, confirmation threshold, ten-minute bundle expiry, mobile-safe review rows, and private CV selection are implemented in the React application. The Supabase `applications` table now includes `autofill_bundle` and `autofill_state` columns for the next authenticated persistence slice. The current local application queue stores the generated bundle while direct API persistence and the companion extension executor remain ahead.

## Progress update

| Feature area | Progress |
|---|---:|
| Profile-aware ApplyFlow | 55% |
| Application Pack generation | 52% |
| Autofill classification and review | 35% |
| Confirmed answer learning | 38% |
| Unassisted reuse policy | 20% |
| Browser-extension handoff | 12% |
| Direct ATS/API execution | 8% |
| Overall product | 54% |

These estimates measure user-flow delivery, data contracts, safety controls, and validation—not the volume of fields that can be automatically submitted.


## Express AutoFill control — 25 August 2026

The ApplyFlow review screen now includes an explicit **AutoFill forms** button. The action manually rebuilds the current source-backed bundle and reports how many safe fields are prepared, how many require review, and how many are blocked. It does not open an employer site, submit an application, or bypass any policy gate. The button is intentionally mobile-friendly and keeps sensitive, legal, CAPTCHA, login, MFA, payment, identity-verification, and unknown fields in their existing user-controlled states.

| Feature area | Updated progress |
|---|---:|
| Express AutoFill control | 45% |
| Autofill classification and review | 40% |
| Overall product | 55% |


## Visible form write-back fix — 25 August 2026

The express AutoFill action now writes safe bundle values back into the visible Application Pack controls instead of only generating metadata. Verified full name, first name/last name aliases, email, phone, and target role values are covered by regression tests. Sensitive values remain suggestions requiring confirmation, while legal and unknown fields remain blocked.

| Fix area | Status |
|---|---|
| Full name mapping | Fixed and tested |
| First/last-name aliases | Fixed and tested |
| Email and phone write-back | Fixed and tested |
| Target-role classification and write-back | Fixed and tested |
| Sensitive/legal/unknown safeguards | Preserved and tested |
| Express AutoFill control | 55% |
| Autofill classification and review | 45% |


## Application execution readiness and console diagnosis — 25 August 2026

The next application-process safeguard is now active: if a job already exists in the local Application Queue, JobMap disables the second ApplyFlow launch and labels the opening `Already in tracker`. This prevents duplicate packs before direct ATS/API execution and browser-assisted execution are added.

The reported console errors are not emitted by JobMap. The visible `grammarly.js`, `RenderWithStyles`, `chrome-extension://.../g2External.styles.css`, and `app messages from Iterable` messages originate from installed browser extensions, specifically Grammarly and related extension assets. No matching `console.error`, `console.warn`, Grammarly, or `chrome-extension` references exist in JobMap source. Testing with the Grammarly extension disabled for JobMap or in a clean private window is the appropriate way to isolate application-owned errors.

| Application workstream | Updated progress |
|---|---:|
| Duplicate application protection | 70% |
| Execution status and safe pause states | 22% |
| Direct ATS/API execution | 10% |
| Browser-extension execution | 12% |
| Overall product | 56% |
