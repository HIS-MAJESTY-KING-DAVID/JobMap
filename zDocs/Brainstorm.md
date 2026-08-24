# JobMap product brainstorm

## Product direction

JobMap should become a **Cameroon-first gateway to work anywhere**. Cameroon Local remains the trusted map for onsite and hybrid roles across all regions. Global Remote becomes a worldwide remote-job discovery and application workflow optimized for people applying from Cameroon.

The product should compete with swipe-based autoapply tools by combining speed with better context. Job seekers should know whether a role accepts applicants from Cameroon, whether the hours are workable, whether the contract is realistic, whether the source is trustworthy, and what the application will contain before they submit anything.

## ApplyFlow

ApplyFlow is the main differentiating feature. It provides a swipe queue, explainable fit and eligibility summaries, a reusable profile, tailored application packs, and an application tracker. The user can reject, save, or apply to each role. The default application experience is hybrid: official APIs and approved integrations where available, guided browser handoff or assisted form completion elsewhere, and explicit final confirmation before submission.

JobMap should automate repetitive preparation without making consequential decisions for the user. It must not invent qualifications, answer sensitive questions without user input, submit duplicates, or silently submit an application.

## Simplify support

The first Simplify integration should accept a user-provided Simplify Job Tracker CSV and import saved or applied jobs into JobMap Tracker. A separate resume/profile import should accept a PDF, DOCX, or pasted profile text and produce a reviewable draft. The import must show field mapping, conflicts, deduplication, and confirmation.

JobMap should not request Simplify credentials or read private browser-extension storage. A future partner/API integration can add structured profile import only if Simplify documents and authorizes it. The public Simplify help center documents tracker CSV import/export, but not a public profile API. [1]

## Mobile-first PWA

The mobile product should use bottom navigation for Discover, Swipe, Saved, Tracker, and Profile. Cameroon Local should open with feed plus map context; Global Remote should open with the swipe queue. Job cards need large thumb targets, clear source and eligibility badges, concise summaries, one-handed filters, and shareable links.

PWA capabilities include installation, an offline application shell, cached saved jobs and tracker state, document upload, resilient loading, accessible focus states, and opt-in notifications. Offline data must always display last verified and expiry timestamps.

## Account and profile model

Discovery remains public. Email and Google sign-in unlock saved preferences, cross-device sync, profile versions, CV storage, ApplyFlow, application history, and alerts. The durable model should include an account, professional profile, work authorization, languages, timezone, preferred locations, salary preferences, documents, saved jobs, saved searches, applications, application events, consent, and notification settings.

## Global remote eligibility

Remote eligibility must be a first-class field, not an assumption. Candidate badges include Cameroon eligible, Africa eligible, worldwide remote, location unclear, and not eligible. Matching should consider country restrictions, contractor or employee status, timezone overlap, language, salary basis and currency, sponsorship, travel, and required equipment or connectivity.

## Source strategy

Use official institutional sources, public employment services, verified employer ATS endpoints, authorized RSS/Atom feeds, and reputable platforms with clear freshness and reuse terms. Preserve canonical links and attribution. Do not scrape sources that restrict automated use without permission. FNE and ReliefWeb Cameroon RSS are the first credible source additions; JEME/MINEFOP and Emploi.cm require terms or feed review.

## Release roadmap

| Release | Outcome | Main scope |
|---|---|---|
| R0 | Trustworthy foundation | Source health, refresh reliability, remote-location semantics, and mobile baseline. |
| R1 | Installable JobMap | Mobile navigation, PWA shell, offline saved state, responsive cards, and shareable links. |
| R2 | Portable user profile | Email/Google sign-in, preferences, CV storage, profile versions, Simplify tracker import, and resume/profile import. |
| R3 | Remote ApplyFlow | Global remote feeds, eligibility engine, swipe queue, Fit + Trust cards, Application Pack, and tracker. |
| R4 | Controlled automation | Official APIs, approved browser handoff, final confirmation, audit trail, duplicate prevention, and source-specific controls. |

## Open questions

The next design discussion should settle which remote sources are allowed in the first global launch, which fields are mandatory before a job can enter ApplyFlow, whether the first profile parser uses deterministic resume extraction or assisted AI extraction, and which application sites can support approved autofill. The product should launch with a trustworthy assisted flow before attempting high-volume batch submission.

## Reference

[1]: https://help.simplify.jobs/articles/2140179-using-the-job-tracker "Simplify Help: Using the Job Tracker"

## Current implementation snapshot

The current estimated product progress is **46% overall**. ApplyFlow now has an editable in-site Application Pack and a user-confirmed Simplify profile bridge: a user can select a job, review and edit the role headline, cover note, and screening answers inside JobMap, import selected profile fields from a user-provided Simplify export or copied text, save the pack into a local queue, and choose a transparent manual fallback. The flow remains user-controlled and does not submit applications automatically. The sidebar scrolls as one surface and keeps the five section buttons visible on web and mobile.

| Feature area | Progress |
|---|---:|
| Mobile-first responsive UI | 65% |
| PWA installation and offline shell | 35% |
| Global remote source network | 40% |
| Global remote eligibility engine | 15% |
| Swipe discovery queue | 12% |
| Application Pack generation | 22% |
| Hybrid assisted application | 5% |
| Simplify profile/resume import | 18% |
| Email and Google sign-in | 0% |

The remaining ApplyFlow work is profile-backed tailoring, Simplify tracker CSV and resume-document import, eligibility-aware ranking, swipe gestures, application history, form assistance through approved paths, and final user confirmation with audit records.
