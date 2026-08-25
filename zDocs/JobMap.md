# JobMap

JobMap is a **Cameroon-first, globally useful job-discovery and application platform**. It helps job seekers find credible openings, understand where they can work, and move from discovery to a prepared, user-reviewed application. Cameroon remains the geographic foundation for onsite and hybrid roles; the expanded product adds worldwide remote opportunities for applicants based in Cameroon.

## Current product scope

The existing vertical slice supports All Cameroon browsing, major-city selection across the regions, radius filtering, title/company/skill/location search, work-mode and employment filters, synchronized map markers, source-linked job details, saved openings, saved searches, and browser-local notification preferences.

The target product has two modes. **Cameroon Local** is map-led and covers onsite and hybrid roles across cities and regions. **Global Remote** is feed- and swipe-led and covers remote roles that may be available to applicants in Cameroon. Remote roles must expose eligibility, timezone, contract, language, salary, and location restrictions instead of being treated as generic “remote” jobs.

The full scope, confirmed decisions, roadmap, and percentage progress tracker live in [`Product roadmap and progress.md`](Product%20roadmap%20and%20progress.md).

## Run locally

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The production checks are:

```bash
npm run lint
npm run build
npm run test:smoke
```

## Refresh the feed locally

```bash
npm run ingest
```

The ingestion command reads `data/sources.json`, fetches enabled public sources, normalizes records into the frontend contract, estimates coordinates only when the source provides a city or region fallback, deduplicates postings, removes expired roles, and writes:

- `public/jobs.json` — the feed consumed by the map and remote-job feed.
- `public/ingestion-meta.json` — generated time, job count, source status, and errors.

Current source families include Greenhouse, RSS/Atom, ReliefWeb Cameroon RSS, and the official FNE public employment service. FNE uses a bounded dedicated public-listing adapter that preserves official detail URLs and source-provided expiry dates. ReliefWeb’s API remains separately approval-gated; its public Cameroon RSS feed is the low-friction path.

## ApplyFlow

ApplyFlow is the application workflow for the Global Remote mode and later for Cameroon Local roles. A user maintains a reusable profile with skills, experience, education, languages, timezone, work authorization, target roles, salary expectations, preferred contract type, and approved CV versions.

For each job, JobMap should show an explainable fit summary and a Remote Eligibility Badge. Selecting **Apply** creates an Application Pack containing the chosen CV, a tailored profile summary, a concise cover message, and suggested answers to standard screening questions. The user reviews the pack before opening the original application page or confirming a supported submission.

The application method is deliberately hybrid. Official APIs or explicitly approved integrations may handle supported submissions. Other employers use a guided browser handoff or assisted form completion. JobMap must not invent qualifications, answer sensitive questions without explicit user input, submit duplicate applications, or silently submit applications on the user’s behalf.

## Simplify support

JobMap will support user-initiated Simplify imports. The first supported lane is Simplify Job Tracker CSV import, which maps saved or applied jobs into JobMap Tracker. A separate resume/profile import accepts a user-provided PDF, DOCX, or pasted profile text and creates a reviewable draft profile.

Simplify’s public help documentation confirms CSV import/export for its Job Tracker, with Company name and Position Title required and Location optional. The reviewed public documentation does not expose a public profile API or one-click profile export, so JobMap must not request Simplify credentials or attempt to read private extension storage. The import design and field mapping are documented in the product roadmap. [1]

## Accounts and persistence

Discovery remains available without an account. Email and Google sign-in are required for saved preferences, cross-device synchronization, uploaded CVs, ApplyFlow, application history, and notifications. The target architecture needs a backend database, secure private document storage, profile versions, saved searches, application events, consent records, and notification preferences.

The current static application still stores saved items locally. Migration to a hosted full-stack application should preserve the normalized `public/jobs.json` contract while moving user-specific data behind authenticated procedures and controlled storage.

## Mobile-first PWA

The mobile experience should prioritize a bottom navigation structure of **Discover, Swipe, Saved, Tracker, and Profile**. The first screen should be a fast job feed rather than a dense desktop map. The Cameroon Local mode can switch into the map view, while Global Remote defaults to the swipe queue.

The PWA scope includes an installable manifest, icons, cached application shell, offline access to saved jobs and tracker state, mobile document upload, shareable job links, resilient loading states, accessible focus behavior, and opt-in notifications. Offline status must never imply that a job remains open; last verification and expiry must remain visible.

## Source expansion

The source registry separates verified sources from candidates requiring permission, terms review, or endpoint validation. FNE and ReliefWeb Cameroon RSS are now represented as source families. JEME/MINEFOP and Emploi.cm remain candidates until their reuse conditions or supported feeds are confirmed. Official employer boards, universities, NGOs, public institutions, and authorized local feeds should be added source by source.

The ingestion system deliberately does not scrape arbitrary HTML result pages or bypass access controls. Every source must retain provenance, canonical application URL, posting date where available, last verification time, expiry, and source-health metadata.

| Adapter | Configuration | Current status |
|---|---|---|
| FNE public listings | `url`, `pageSize` | Implemented; official public-listing adapter. |
| ReliefWeb Cameroon RSS | `url` | Implemented; public feed with attribution. |
| ReliefWeb v2 | `appname` plus Cameroon filter | Implemented; requires approved appname before API activation. |
| Greenhouse | `boardToken` | Implemented; employer-specific. |
| Lever | `site` | Implemented; employer-specific. |
| RSS / Atom | `url` | Implemented; publisher approval and freshness review required. |
| JEME / MINEFOP | Feed or authorized adapter to be confirmed | Candidate only. |
| Emploi.cm | Publisher feed or written permission required | Candidate only. |

## Automatic updates

`.github/workflows/refresh-jobs.yml` runs every six hours and can also be triggered manually. It installs dependencies, runs the ingestion script, publishes the refreshed feed and metadata, and commits only when generated data changes. The scheduled runner’s network access must be monitored for FNE and ReliefWeb because source access can differ by execution environment.

At larger scale, move the same adapter and normalization logic into a hosted backend with a database, source-health monitoring, retry queues, raw-record history, a review queue for uncertain locations, and user-specific alert delivery. Keep the frontend consuming the same normalized fields so the infrastructure can evolve independently.

## Data contract

Each opening can include `id`, `title`, `company`, `location`, `city`, `region`, `country`, `lat`, `lng`, `description`, `url`, `applyUrl`, `source`, `sourceUrl`, `postedAt`, `lastVerifiedAt`, `expiresAt`, `employmentType`, `workMode`, `salary`, `status`, `locationConfidence`, `remoteEligibility`, and `tags`.

The pipeline preserves postings during temporary source failures and expires them only after their configured TTL. This prevents a transient upstream error from wiping the map while still preventing indefinitely stale roles.

## References

[1]: https://help.simplify.jobs/articles/2140179-using-the-job-tracker "Simplify Help: Using the Job Tracker"

## Current progress snapshot

The current estimated product progress is **52% overall**. The web and mobile sidebar now scroll as one touch-friendly surface with the five section buttons kept visible. ApplyFlow now includes an editable in-site Application Pack, a local application queue, a user-confirmed Simplify profile bridge, Supabase Email/Google auth wiring, a private CV bucket, a profile sync foundation, and explicit answer-memory confirmation.

| Area | Progress | Current capability |
|---|---:|---|
| Mobile-first responsive UI | 65% | Responsive shell, bottom navigation, touch targets, visible section navigation, and unified desktop/mobile sidebar scrolling. |
| PWA installation and offline shell | 35% | Manifest, icon, service worker, app-shell caching, and feed caching. |
| Global remote source network | 43% | Jobicy, Remotive, Remote OK, and WWR adapters with live feed refresh; ATS endpoint candidates are documented for approved expansion. |
| Global remote eligibility | 15% | Evidence-based eligibility labels and detail-panel badges. |
| ApplyFlow | 35% | Selected-job launch, in-site editable Application Pack, local queue with recovery states, profile-aware draft preview, user-confirmed profile import, Supabase auth/private CV foundations, answer-memory confirmation, transparent manual fallback, and no silent submission. |
| Simplify import | 22% | User-provided CSV/JSON/TXT/Markdown or pasted profile text is previewed, selectively mapped, and confirmed into the local profile; private CV storage is now available for approved versions. |
| Email/Google accounts | 23% | Supabase client and Email/Google entry points are wired; provider credentials, verification, consent, account settings, and production redirect configuration remain. |

ApplyFlow is therefore **about 35% complete** as an end-to-end feature. The remaining work is profile versioning, CV selection and signed downloads, Simplify tracker CSV and resume-document extraction, direct employer/ATS adapters, the browser-extension execution channel, deeper profile-backed tailoring, fit and eligibility ranking, swipe gestures, application history, and final confirmation/audit records.
