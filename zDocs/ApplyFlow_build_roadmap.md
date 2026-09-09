ApplyFlow is a **working preparation control plane**. It is **not** a working apply loop yet. Sprout’s AutoApply closes discovery → tailored pack → portal fill/submit → tracker. JobMap currently stops after the pack is saved, then asks you to open the employer site yourself.

JobMap should **not** copy silent “apply while you sleep.” The product contract is hybrid: prepare and approve in JobMap, then execute through an approved API, the extension, or an honest manual fallback. What is missing is that **execution layer actually running**.

---

## Build progress (updated 2026-09-09)

| Item | Status | Progress |
| --- | --- | --- |
| P0.1 Handoff that actually executes (capture script on JobMap origins → background opens/focuses `applyUrl` → employer fill → receipt back into tracker) | Implemented: `extension/capture.js`, `extension/background.js`, `extension/content.js`, `extension/adapters.js`, manifest v0.3.0. Split origin/host checks; cover letter now carried in the bundle; receipt relayed through the worker; timeout + `extension_unreachable` typing. Needs one real-browser Greenhouse run to confirm. | 90% |
| P0.2 Portal field detection + adapter map (live form scan, allowlist, highlight, pause on required/unknown) | Implemented in content.js/adapters.js: skips file/password/CAPTCHA/legal/sensitive/unknown, highlights filled + blocked, reports `blockedRequired`. | 80% |
| P0.3 CV as a user action (no bytes through messages) | Done: file inputs are never touched; popup + receipts show the attach-yourself hint. | 100% |
| P0.4 Typed execution states in the queue (`queued → filling → needs_user / failed / manual_fallback / cancelled`, typed failures, Retry / Continue manually / Cancel) | Implemented in JobsDashboard + ApplicationQueuePanel + ApplyFlowPanel. Failure taxonomy: `captcha`, `auth`, `unexpected_field`, `layout_change`, `expired_job`, `network`, `extension_unreachable`, `revoked`. Cancel revokes the live bundle. | 90% |
| P1.5 Ingest employer questions before approval | Implemented: Greenhouse job payload → normalized questions → question review in the pack → saved with the application. Text/select/boolean answered in pack; file marked user-attach. | 85% |
| P1.6 Capability registry as data | Implemented: `src/services/capabilityRegistry.js` (per-adapter capability, domains, supported fields, health); shown in ApplyFlow prepare step and job detail route. `api` is never claimed without a registry entry. | 85% |
| P1.7 Direct submit that cannot lie | Implemented: `atsAdapters.js` only returns success with a real Greenhouse `json.id`; any 2xx without a receipt is an open-fallback and is never recorded as Applied. | 90% |
| P1.8 Production handoff security (server-issued tokens) | Not started: still client HMAC + 10-minute expiry + revoke-on-cancel. HMAC prevents replay but not extraction by a session holder. | 20% |
| P2 Breadth (Lever / Ashby / SmartRecruiters / Workday adapters) | Registry entries exist as `unverified`; no adapter implementations. | 5% |

**Overall: ~60%.** P0 (the definition of done) is built end-to-end in code and the production gates are green (`lint`, `build`, `test:smoke`, `test:applyflow`, `test:production`). Remaining P0 work is verification: run one real Greenhouse job through the loaded extension in a real browser and confirm the receipt lands in the tracker.

---

## What already works

- In-site Application Pack: name, email, phone, CV picker, cover note, screening draft, eligibility gate.
- Source-backed autofill **of JobMap’s own fields** (not the employer form).
- Tracker + dashboard: draft / applied / interview / follow-ups, CSV import, user-confirmed receipts.
- Capability **labels** (Greenhouse/Stripe → `extension`; everything else → `manual`).
- A Greenhouse **attempt** from the SPA, plus an extension that can fill a few named inputs **if a bundle magically appears on the employer page**.

That last clause is the break.

---

## Why the gap is still large

**Send to extension cannot reach the employer form.** ApplyFlow posts `JOBMAP_AUTOFILL_HANDOFF` on the JobMap origin. The content script is only injected on Greenhouse/Stripe pages, and `background.js` never stores the bundle or opens `applyUrl`. The employer tab never sees the pack.

**Even if it did, fill would reject the bundle.** `content.js` requires `bundle.origin === window.location.origin`. The bundle is bound to JobMap; the form lives on `boards.greenhouse.io`. Those origins never match.

**Autofill is not portal-aware.** Suggestions are a hardcoded list of JobMap fields. There is no scrape or ATS schema of the real questions, file inputs, custom Greenhouse fields, or multi-step widgets.

**“Submit via Greenhouse” is not a reliable in-site apply.** Browser `fetch` to `boards-api.greenhouse.io` will usually fail CORS. There is no CV upload (by design in the adapter). Jobs are still labeled `extension`, not `api`. A 2xx without a verified receipt should not mean Applied.

**The queue is a tracker, not an execution queue.** Sprout’s review queue has document review vs question review, then `queued` → `filling` → `needs_user` / `submitted` / `failed`, with typed failures (CAPTCHA, layout, auth timeout, unexpected field) and Retry / Continue manually / Cancel. JobMap has statuses on paper; nothing drives fill, pause, or retry.

**Cover notes are templates, not job-specific generation.** Screening answers are a blank textarea, not the employer’s questions.

Those five items are why it still feels like a different product, not polish.

---

## What we must build for ApplyFlow to be fully functional

### P0 — Close the loop on one allowlisted ATS (Greenhouse)

This is the definition of done for “ApplyFlow works”:

1. **Handoff that actually executes**
   - Content script on JobMap origins: capture the approved bundle.
   - Background worker: save it, open/focus `applyUrl`, tell the employer tab to fill.
   - Employer script: fill, pause, post a receipt back into ApplyFlow (`filled` / `skipped` / `rejectedFields` / `reason`).
   - Split checks: JobMap origin authenticates the message; employer host is the fill allowlist. Stop requiring `bundle.origin === greenhouse origin`.

2. **Portal field detection + adapter map**
   - Read the live form (labels, `name`/`id`, required, file, select).
   - Map allowlisted safe fields (name, email, phone, LinkedIn, site, cover letter body).
   - Highlight fills; **do not touch** CAPTCHA, login, MFA, payment, legal, unknown, work auth, sponsorship, salary, demographics.
   - Pause with a `needs_user` event when a required field is blocked.

3. **CV as a user action, not a silent upload**
   - Signed download or “attach this file” affordance; user (or extension file picker) attaches the selected CV. Do not ship CV bytes through `postMessage`.

4. **Typed execution states in the queue**
   - `ready_for_user_approval` → `queued` → `filling` → `needs_user` | `submitted` | `failed` | `manual_fallback` | `cancelled`.
   - Failure reasons: `captcha`, `auth`, `unexpected_field`, `layout_change`, `expired_job`, `network`.
   - Preserve the pack; never silent-retry a submit. Offer Retry / Continue manually / Cancel.

Until this path works on one real Greenhouse job in a real browser, ApplyFlow is not functional as an apply product.

### P1 — Make the pack match the job, then make API submit honest

5. **Ingest employer questions before approval**Greenhouse job payload or a one-shot extension probe of the apply form → show those questions in the pack (document review vs question review). Approval then means “these answers are for _this_ form.”
6. **Capability registry as data**Per job: `api` | `extension` | `manual` | `unsupported`, allowed domain, auth required, supported fields, last adapter health. Show it **before** the user builds a pack. Label `api` only when a path has returned a verifiable receipt in tests.
7. **Direct submit that cannot lie**If you want in-site Greenhouse submit: a server/edge proxy (or submit from the employer origin in the extension), attach/confirm CV, parse a real confirmation id, write `adapter_submitted` only then. Today’s SPA POST should stay a fallback that opens the page, not “Submitted.”
8. **Production handoff security**
   Server-issued, short-lived, revocable tokens. The HMAC that embeds `sessionKey` in the payload does not stop replay by anyone who can read the message. Keep 10-minute expiry and revoke-on-cancel.

### P2 — Breadth after one path is proven

9. Lever, Ashby, SmartRecruiters, Workday adapters — only after Greenhouse P0/P1, with tests and failure taxonomy.
10. Optional Gmail evidence, swipe undo, richer LLM tailoring — useful, **not** what makes ApplyFlow an apply engine.

---

## Explicit non-goals (keep these)

Do not iframe employer portals, farm credentials on a server, bypass CAPTCHA, or mark Applied because a request was sent. Those are how JobMap stays safer than Sprout-style auto-submit, not leftovers.

---

## Practical sequence

| Slice                | Exit condition                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 Greenhouse bridge | User saves pack → Send to extension → Greenhouse tab opens → safe fields filled → JobMap shows fill receipt and`needs_user` until they submit |
| P0 queue states      | Failures are typed; pack survives; Retry / Manual / Cancel work                                                                               |
| P1 question ingest   | Pack questions = that job’s form, not a generic textarea                                                                                      |
| P1 honest API        | At most one ATS path with a real confirmation id; otherwise stay extension/manual                                                             |
| P2 more ATS          | New hosts only after adapter tests + health                                                                                                   |

The parity gap is not another editor screen. It is **execution**: move the approved pack onto a real form, pause correctly, and write evidence back. Until Greenhouse does that end-to-end, ApplyFlow will keep feeling like a notes app next to Sprout AutoApply.
