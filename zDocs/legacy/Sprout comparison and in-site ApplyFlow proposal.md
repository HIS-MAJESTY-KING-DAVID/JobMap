# Sprout comparison and in-site ApplyFlow proposal

**Last updated:** 24 August 2026  
**Purpose:** Define how JobMap can keep the application experience inside JobMap without pretending that arbitrary employer portals can be embedded or controlled from a static website.

## Executive recommendation

JobMap should treat the in-site experience as a **control plane**. The user discovers a role, reviews eligibility, selects a CV, edits the generated answers, approves the application pack, starts the application, and tracks the result inside JobMap. Submission should then use the strongest available execution channel for that employer: an approved application API first, a JobMap companion extension for browser-assisted filling second, and a transparent manual fallback when neither is supported.

This is the practical way to satisfy the product goal without promising an impossible universal iframe. External employers can prevent their pages from being embedded using Content Security Policy `frame-ancestors` or `X-Frame-Options` [8]. Even when an external page loads in an iframe, the browser same-origin policy prevents JobMap from generally reading or manipulating its fields across origins [9].

## What Sprout publicly shows

Sprout’s public product pages describe one connected loop: find roles, generate tailored documents, apply, and track applications [1]. Its AI Apply page says the system reads job portals, detects required fields, fills them from the user’s profile and resume, and submits applications; the same page describes a human-in-the-loop review step and automatic tracker logging [2]. Sprout also says it connects to verified sources and company pages, removes duplicates and dead links, and matches profiles to active roles [3].

The public Help Center gives more useful product-design evidence than technical implementation detail. Manual Review places right-swiped jobs into a review queue, separates document review from question review, allows edits or regeneration, and sends only after approval [4]. Sprout documents failure cases involving layout changes, CAPTCHA or anti-bot systems, unexpected fields, and authentication timeouts; it says the system stops to prevent errors and provides a manual-application fallback [5]. The public material does not enumerate every source endpoint or prove whether each submission uses a direct API, browser automation, or another mechanism. Those details should be treated as unverified [1] [2] [3].

## Architecture options

| Approach | Does the user stay in JobMap? | Strengths | Constraints | Recommendation |
|---|---|---|---|---|
| Approved employer or ATS API | Yes; the entire form and confirmation can be hosted in JobMap | Best reliability, clean audit trail, no portal scraping, easiest to explain to users | Must be supported and authorized per employer or partner; public job ingestion does not automatically imply submission access | **Primary path** |
| JobMap companion browser extension | Mostly; JobMap remains the control plane while the extension fills an allowlisted portal | Covers more portals, uses the user’s own authenticated browser session, can pause for CAPTCHA or unusual questions | Requires an extension, explicit permissions, portal-specific adapters, and a clear user-visible browser handoff | **Secondary path** |
| Server-side browser worker | Usually invisible to the user until a result is returned | Can run controlled adapters centrally and supports queueing | High operational and compliance risk; credentials, CAPTCHA, layout changes, rate limits, and portal terms make this unsuitable as a universal default | Use only for approved, allowlisted integrations |
| Embedded iframe or reverse-proxied portal | Not reliably | Appears to keep everything on one page | Often blocked by framing policy; cross-origin DOM control is restricted; proxying can create security, privacy, and terms-of-service problems | **Reject as a general strategy** |

## Proposed JobMap flow

### 1. Build the in-site Application Pack

The user should never begin with a naked “Open application” button. ApplyFlow should first display the role, eligibility signal, source trust, selected CV version, profile facts, tailored summary, cover message, and screening-question drafts. Each field needs a provenance label such as **from profile**, **from CV**, **generated draft**, or **requires your answer**. Sensitive questions, work authorization, salary expectations, demographic information, and legal attestations must always require direct user input.

### 2. Add an application-capability registry

Every job should carry an application capability rather than only an `applyUrl`. The registry should record whether the employer supports an approved API, an extension adapter, a manual handoff, or no supported automation; the allowed domain; required authentication; supported fields; known question types; and the last adapter health check. JobMap should show this capability before the user approves an application.

Suggested states are `draft`, `needs_review`, `ready_for_user_approval`, `queued`, `filling`, `needs_user`, `submitted`, `failed`, `cancelled`, and `manual_fallback`. JobMap must never show `submitted` merely because a request was sent; that state requires a confirmed response or explicit user confirmation.

### 3. Start with direct integrations

The first true “stay in JobMap” submissions should target employers or ATS providers that explicitly expose an approved application endpoint. Each integration should be narrow and tested against a small allowlist. The existing Greenhouse, RSS, and global source adapters are useful for discovery, but they do not by themselves grant permission or technical access to submit applications. Application adapters must be verified separately.

### 4. Add a companion extension for the long tail

For portals without a supported API, the extension should receive only an approved Application Pack and a specific job/application URL after the user clicks **Start assisted application**. It should operate only on allowlisted domains, fill ordinary profile fields, highlight every filled value, pause for unknown fields, and return control to the user for CAPTCHA, sensitive questions, uploads, and final submission. The extension should not read Simplify private storage, capture unrelated page content, or store employer credentials.

This gives the user a JobMap-hosted experience for preparation, review, progress, and tracking while being honest that the final portal interaction occurs in a permitted browser context. If the user does not install the extension, the same Application Pack should remain usable through a manual fallback without data loss.

### 5. Make queue and failure handling visible

Sprout’s review queue and failure behavior are strong patterns to borrow. JobMap should provide a queue that shows the review type, created time, adapter, required user action, and cancellation option. Failure messages should distinguish an unsupported field, expired job, authentication problem, CAPTCHA, rate limit, portal layout change, and network failure. A failed run should preserve the pack, never silently retry a consequential action, and offer **Retry**, **Continue manually**, or **Cancel** according to the failure type.

## What JobMap should learn from Sprout

| Sprout pattern | What JobMap should take | What JobMap should improve or differentiate |
|---|---|---|
| One loop for discovery, application, and tracking [1] | Keep the user in one product context and remove repeated copy-paste work | Add Cameroon-specific eligibility, timezone, language, and source-trust explanations before applying |
| Profile and resume-driven tailoring [2] [4] | Build a reusable profile and versioned CV system early | Show the source of every generated fact and block invented qualifications |
| Review Queue with document and question review [4] | Use explicit stages and separate document approval from answer approval | Make sensitive questions mandatory user inputs and keep a durable audit record |
| Verified sources, duplicate/dead-link cleanup [3] | Preserve canonical URLs, deduplicate postings, and run source-health checks | Publish source provenance and eligibility evidence rather than only a relevance match |
| Stop on CAPTCHA/layout/auth failures and provide fallback [5] | Treat failure as a normal state with actionable recovery | Add adapter health, allowlists, idempotency keys, and clearer retry/manual controls |
| Credits per application [6] | If JobMap later meters expensive generation or assisted execution, make the cost visible before approval | Do not introduce credits until the core workflow is trustworthy; consider free local preparation and transparent limits |

## Recommended implementation sequence

| Release slice | Deliverable | Exit condition |
|---|---|---|
| A | In-site Application Pack editor | A user can select a CV, edit generated fields, answer required questions, and save a draft without leaving JobMap |
| B | Application capability registry and queue | Every job clearly indicates API, extension, manual, or unsupported execution, with visible states and cancellation |
| C | First approved direct submission adapter | One narrowly scoped employer/partner path can submit and return a verifiable result, with tests and an audit event |
| D | Companion extension proof of concept | On one allowlisted application site, the extension fills approved ordinary fields, pauses on unknown/sensitive fields, and hands final submission to the user |
| E | Tracker and recovery | Submitted, needs-user, failed, cancelled, and manual-fallback outcomes are persisted with timestamps and retry rules |
| F | Broader source and employer expansion | New adapters are added only after source permissions, application capability, privacy, and failure behavior are reviewed |

## Non-negotiable safeguards

JobMap should not store employer passwords, silently read third-party extension storage, bypass CAPTCHA or access controls, scrape login-only dashboards, or claim successful submission without evidence. The browser extension should use least-privilege domain permissions and transmit only the user-approved pack for the selected job. Private CVs and profile versions belong in authenticated storage rather than the public repository or a browser-only cache. Every assisted application should have an audit record containing the job, adapter, pack version, fields approved, user confirmation, outcome, and failure reason where applicable.

## References

[1]: https://www.usesprout.com/ "Sprout — AI Job Search"
[2]: https://www.usesprout.com/features/ai-apply "Sprout — AI Apply"
[3]: https://www.usesprout.com/blog/remote-jobs "Sprout Blog — Remote Jobs"
[4]: https://help.usesprout.com/en/articles/13604310-reviewing-applications-in-the-web-app-manual-review-mode "Sprout Help — Reviewing Applications in Manual Review Mode"
[5]: https://help.usesprout.com/en/articles/11511529-why-did-sprout-fail-to-submit-my-job-application "Sprout Help — Why did Sprout fail to submit my job application?"
[6]: https://help.usesprout.com/en/articles/11676023-how-do-i-apply-to-jobs-on-sprout "Sprout Help — How Do I Apply to Jobs on Sprout?"
[7]: https://help.usesprout.com/en/articles/16259577-removing-a-job-from-your-review-queue-before-it-s-submitted "Sprout Help — Removing a Job From Your Review Queue Before It’s Submitted"
[8]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors "MDN — CSP frame-ancestors directive"
[9]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy "MDN — Same-origin policy"
