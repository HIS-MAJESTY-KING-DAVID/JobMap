# JobMap ApplyFlow — Architecture, Proposal & Autofill Engine

**Last updated:** 28 August 2026  
**Status:** Shipped in-site editable pack, local queue, user-confirmed profile settings bridge, and initial database/storage persistence foundation.

---

## 1. Product Vision & Architecture

ApplyFlow is the bridge from credible discovery to a prepared, user-reviewed application. JobMap competes on eligibility clarity, source trust, bilingual preparation, and mobile convenience—not application volume alone.

The system is split into two connected engines:
- **Cameroon Local:** A trusted map for onsite and hybrid work across Cameroon cities and regions.
- **Global Remote:** A feed- and swipe-led experience for remote roles available internationally to Cameroon-based applicants.
- **ApplyFlow Control Plane:** The unified user-facing workspace that handles CV selection, profile fact mapping, tailoring, explicit approvals, and application tracking.

The architecture strictly separates public discovery (anonymous Map and Feed) from private career data (stored profiles, CVs, and application history).

```
Cameroon discovery feed
        │
        ├── Ingestion pipeline (FNE, ReliefWeb, RSS, Jobicy, Remotive, Remote OK, etc.)
        ▼
Global/Local normalized openings
        │
        ├── ApplyFlow interactive panel (CV selection, AI-assisted tailors)
        ▼
Reviewable user-approved Application Packs
        │
        ├── Execution layer (Direct API, companion browser extension, or manual fallback)
        ▼
Durable lifecycle tracking & cloud-synced audit history
```

---

## 2. In-Site Proposal & Sprout Comparison

JobMap treats the in-site experience as a **control plane**. The user should discover roles, review eligibility, select CV versions, edit generated cover letters or screening answers, and track results within JobMap.

### The embedded iframe limitation
JobMap rejects the strategy of trying to embed arbitrary employer portals inside an iframe. External portals restrict embedding via `X-Frame-Options` or Content Security Policy `frame-ancestors`. Furthermore, the browser's same-origin policy prevents JobMap from reading or manipulating fields inside cross-origin frames.

### Sprout Analysis & Adaptations
Wonsulting’s Sprout describes a unified loop: find roles, generate tailored documents, apply, and track. Its manual review queue separates document review from question review and supports a manual fallback on anti-bot/CAPTCHA, layout, or auth failures.

JobMap differentiates and builds upon these concepts:

| Sprout pattern | JobMap take | JobMap improvement & differentiation |
|---|---|---|
| One loop for discovery, application, and tracking | Keep the user in one product context | Add Cameroon-specific eligibility, timezone, language, and source-trust explanations before applying |
| Profile and resume-driven tailoring | Build a reusable profile and versioned CV system early | Show the source of every generated fact and block invented qualifications |
| Review Queue with document and question review | Use explicit stages and separate document approval from answer approval | Make sensitive questions mandatory user inputs and keep a durable audit record |
| Verified sources, duplicate/dead-link cleanup | Preserve canonical URLs and run source-health checks | Publish source provenance and eligibility evidence rather than only a relevance match |
| Stop on CAPTCHA/layout/auth failures | Treat failure as a normal state with actionable recovery | Add adapter health, allowlists, idempotency keys, and clearer retry/manual controls |

---

## 3. ApplyFlow Autofill Engine

The ApplyFlow autofill engine converts a verified JobMap profile, selected private CV, and user-confirmed answer memory into a reviewable field bundle. It is designed to prioritize safety and never silently submits or invents qualifications.

### Ten-step workflow

1. **Select a job and an approved CV version**: The user initiates ApplyFlow; a default CV is suggested.
2. **Build a normalized field map**: Mapping employer inputs to stable field IDs (e.g. `email`, `phone`, `workAuthorization`).
3. **Classify every field**: Fields are classified as safe profile, safe CV, generated draft, sensitive, legal, unknown, or blocked.
4. **Resolve verified profile facts**: Contact details, target role, and location are resolved from the saved profile.
5. **Resolve CV/profile facts**: Skills, education, experience, GPA, and certifications are extracted if explicitly stored.
6. **Generate editable drafts**: Cover notes, summaries, and motivation answers are generated as drafts and require review.
7. **Reuse confirmed answer memory**: Authorization, sponsorship, and salary answers can be populated from confirmed memory.
8. **Present the review state**: Each field shows its source, status, confidence, and whether it requires confirmation.
9. **Create an expiring handoff bundle**: Approved safe fields enter a bundle that expires after ten minutes and contains no credentials.
10. **Execute or pause**: Approved APIs or the browser extension fill safe fields; CAPTCHA, login, legal, and unknown fields pause for the user.

### Learning & Unassisted Reuse Policy
JobMap records a confirmed answer only after the user checks the "remember" option and saves the pack. A user may enable unassisted reuse for a sensitive answer after confirming it at least three times.
- Unassisted reuse is **field-specific, user-enabled, source-backed, and revocable**.
- Any changed question label, changed employer context, expired memory, or missing source evidence resets the field to "review required".
- Final submissions and legal attestations always remain user actions.

### Source and Status Contract
Every suggestion includes a stable field ID, classification, source reference, confidence score, status, and reason. Statuses are:
- `autofill`: Safe field ready to populate.
- `suggested`: Sensitive field populated but requires user verification.
- `needs_input`: Field requires user text.
- `blocked`: Legal/MFA/payment/demographic fields requiring direct manual interaction.
- `paused`: Execution paused on credentials or CAPTCHA.

The future browser extension must accept bundles only from the matching JobMap origin, reject expired bundles, fill only listed safe fields, and return control to the user when encountering CAPTCHAs, logins, or unknown questions.

---

## 4. Execution Channels & Safeties

Submission uses the strongest available execution channel:
1. **Approved employer or ATS API**: Best reliability, clean audit trail, no scraping. Requires partner integration.
2. **JobMap companion browser extension**: Covers more portals using the user's authenticated session. Limits execution to allowlisted domains (e.g. `boards.greenhouse.io`, `job-boards.greenhouse.io`, and Stripe's `/jobs/` route).
3. **Transparent manual fallback**: Used when no automation is supported. The user confirms manual submission from the Tracker and enters notes.

### Safeguards
- JobMap does not store employer passwords, silently read third-party extension storage, bypass CAPTCHA, or scrape login-only dashboards.
- The companion extension uses least-privilege domain permissions and only receives the approved pack for the selected job.
- Duplicate application protection: If a job already exists in the local tracker queue, JobMap disables the second ApplyFlow launch and labels it `Already in tracker`.

---

## 5. Implementation Roadmap & Progress

| Release slice | Deliverable | Exit condition |
|---|---|---|
| **A** | In-site Application Pack editor | User can select a CV, edit generated fields, answer required questions, and save a draft locally (Shipped). |
| **B** | Application capability registry and queue | Every job clearly indicates API, extension, manual, or unsupported execution, with visible states and cancellation (Shipped). |
| **C** | First approved direct submission adapter | One narrowly scoped employer/partner path can submit and return a verifiable result, with tests and an audit event. |
| **D** | Companion extension proof of concept | On one allowlisted application site, the extension fills approved ordinary fields, pauses on unknown/sensitive fields, and hands final submission to the user. |
| **E** | Tracker and recovery | Submitted, needs-user, failed, cancelled, and manual-fallback outcomes are persisted with timestamps and retry rules. |
| **F** | Broader source and employer expansion | New adapters are added only after source permissions, application capability, privacy, and failure behavior are reviewed. |
