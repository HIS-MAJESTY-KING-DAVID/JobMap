# JobMap ApplyFlow — Architecture, Progress & Next Priorities

## Cover
Cameroon to the world.
JobMap ApplyFlow — architecture, progress, and next priorities
24 August 2026

## Slide 1
The product has two connected engines.

- **Cameroon Local:** a trusted map for onsite and hybrid work across cities and regions.
- **Global Remote:** a feed and swipe experience for remote roles available to applicants in Cameroon.
- **ApplyFlow:** the bridge from credible discovery to a prepared, user-reviewed application.

**Product thesis:** JobMap competes on eligibility clarity, source trust, bilingual preparation, and mobile convenience—not application volume alone.

## Slide 2
ApplyFlow turns a job match into a confident next action.

1. **Discover** — surface a role from credible, attributable sources.
2. **Check eligibility** — show country, timezone, language, contract, salary, and work-authorization signals.
3. **Prepare** — assemble the right CV, tailored summary, cover message, and screening drafts.
4. **Review** — let the user edit and approve the application pack.
5. **Handoff** — open the canonical employer page or use an approved integration.
6. **Track** — record the application, next action, and follow-up status.

The current product implements the first guided preparation and handoff slice plus the first hosted profile/storage foundation; the profile-backed automation and approved execution layers are next.

## Slide 3
Trust is the application advantage.

- **Evidence-based eligibility:** worldwide, Africa eligible, Cameroon eligible, restricted, or unclear.
- **Source provenance:** preserve publisher, canonical application URL, freshness, expiry, and source-trust signals.
- **User control:** no invented qualifications, sensitive answers without input, duplicate applications, or silent submission.
- **Hybrid execution:** official APIs where explicitly supported; guided browser handoff elsewhere.

**Design principle:** automate repetitive preparation while keeping consequential decisions with the applicant.

## Slide 4
The architecture separates public discovery from private career data.

**Public acquisition layer**
- FNE and ReliefWeb Cameroon RSS
- Stripe/Greenhouse, Lever, Ashby, SmartRecruiters, and approved employer boards
- Jobicy, Remotive, Remote OK, and We Work Remotely
- Source adapters preserve provenance and normalize every opening

**Normalization layer**
- Deduplication, expiry, freshness, location confidence
- Remote eligibility, salary, country, timezone, language, and contract fields
- Published `jobs.json` feed plus source-health metadata

**User layer**
- Mobile-first PWA with Local/Remote modes
- Profile, CV versions, Simplify imports, Application Pack, tracker
- Supabase-authenticated persistence for profiles and private CV metadata/storage, with applications and consent next

## Slide 5
The mobile PWA is the daily operating surface.

- **Discover:** fast feed with map context for Cameroon Local.
- **Swipe:** one-job-at-a-time Global Remote queue.
- **Saved:** openings and searches worth returning to.
- **Tracker:** applied, interview, offer, rejected, and follow-up states.
- **Profile:** skills, languages, timezone, work authorization, salary, CVs, and application preferences.

Current mobile/web foundation includes responsive cards, touch targets, visible five-section navigation, unified sidebar scrolling, a local Profile workspace, install metadata, service-worker caching, and a network-first feed refresh strategy.

## Slide 6
JobMap is 51% complete overall—and the hosted privacy foundation is now real.

| Workstream | Progress | Current signal |
|---|---:|---|
| Cameroon map, search, radius, filters | 90% | Working national discovery vertical slice |
| Source registry and ingestion | 82% | Seven enabled source families and refreshed metadata |
| Global remote source network | 43% | Four live global adapters plus verified ATS endpoint candidates |
| Mobile-first responsive UI | 65% | Local/Remote modes, visible bottom nav, touch-first shell, unified scrolling |
| PWA installation/offline shell | 35% | Manifest, icon, service worker, feed caching |
| Global eligibility engine | 15% | Evidence-based badges in feed and details |

## Slide 7
ApplyFlow is 31% complete: the in-site editable pack, local queue, user-confirmed profile bridge, Supabase auth wiring, and private CV bucket foundation are working.

**Implemented now**
- Launch ApplyFlow from a selected job.
- Review a two-step preparation sheet.
- Edit a local role headline, cover note, and screening-answer draft inside JobMap.
- Save the approved pack into the local ApplyFlow queue without opening the source site.
- Show a transparent manual fallback while direct APIs and browser-assisted adapters are still ahead.
- Keep the user in control with an explicit no-silent-submission guardrail.

**Not implemented yet**
- Profile versioning and CV selection (authenticated profile sync and private bucket foundation are now shipped).
- Simplify tracker CSV and resume-document import; profile settings bridge is now shipped.
- Real fit scoring and eligibility-aware ranking.
- Swipe gestures, undo, and queue ranking.
- Authenticated profile-backed Application Pack generation, direct ATS submission, and browser-assisted execution.
- Application history, reminders, approved autofill, and audit records.

## Slide 8
The next priority is a portable, trusted applicant profile.

**P0 — make ApplyFlow useful**
- Email and Google sign-in with optional anonymous discovery (client wiring shipped; provider verification/configuration remains).
- Profile model for skills, experience, languages, timezone, authorization, salary, and target roles.
- Private CV/document storage with user-folder RLS, metadata, versioning, signed access, and deletion.
- Simplify Job Tracker CSV import plus PDF/DOCX/pasted-profile import with mapping preview and confirmation.

**P1 — make matching smarter**
- Country and timezone eligibility filters.
- Explainable Fit + Trust scoring.
- Swipe queue with saved state, undo, and daily recommendations.

## Slide 9
Build toward controlled automation—not blind autoapply.

| Horizon | Outcome | Exit signal |
|---|---|---|
| Next slice | Portable profile and Simplify imports | A user can import, review, and approve their profile and tracked jobs |
| Following slice | Eligibility-aware swipe queue | Cameroon-based applicants see why a remote role is or is not viable |
| Then | Application Pack and tracker | A user can move from match to reviewed application and follow-up |
| Later | Hybrid assisted submission | Approved APIs and guided handoff are auditable, reversible, and user-confirmed |

**North star:** JobMap should make every application faster without making the applicant less informed.

Source: JobMap product roadmap and progress, Global remote source datasheet, Supabase auth/storage foundation, and current application implementation status, updated 25 August 2026.
