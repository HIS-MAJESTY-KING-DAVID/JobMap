# JobMap acquisition and continuous update plan

JobMap should treat job acquisition as a **source pipeline** and application preparation as a separate user-controlled workflow. The frontend consumes a stable normalized feed. Source adapters produce postings with provenance and freshness. ApplyFlow consumes eligible postings and produces reviewable application packs and tracked application events.

## Operating model

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| Repository-native refresh | Simple to inspect and inexpensive. Good for public feeds and initial source validation, but user profiles and applications cannot live safely in a static repository. | Low | Low |
| Hosted ingestion and user platform | Supports global sources, retries, source health, accounts, CV storage, application history, alerts, and cross-device sync. Requires backend, database, storage, secrets, and operations. | Usage-based | Medium to high |
| Hybrid migration | Keep repository refresh for public feed export while moving profiles, ApplyFlow, and application tracking to a hosted backend. Preserves the current feed contract and reduces migration risk. | Moderate | Medium |

The recommended path is a **hybrid migration**. The repository workflow remains a fallback and feed-export mechanism, while user-specific functionality moves behind authenticated backend procedures.

## Acquisition lanes

| Lane | Coverage | Source quality requirement | Product surface |
|---|---|---|---|
| Cameroon Local | Onsite and hybrid jobs across Cameroon | FNE, ReliefWeb, institutions, authorized local feeds, verified employer boards | Map, feed, radius, source trust |
| Global Remote | Remote jobs available to applicants in Cameroon | Public feeds, official ATS endpoints, authorized aggregators, clear remote eligibility | Feed, swipe queue, eligibility badge |
| Employer direct | Specific companies hiring in Cameroon or remotely | Greenhouse, Lever, Taleo, or documented employer endpoint | Feed and direct application |
| User-imported | Jobs already tracked by the user | Simplify CSV or user-provided files | Tracker and profile |

The source registry must record owner, endpoint, terms or permission state, location coverage, refresh expectation, canonical URL, field completeness, expiry policy, deduplication key, and failure contact. The system should prefer credible current records over maximum volume.

## Current pipeline

```text
Source registry
    │
    ├── Cameroon institutional sources: FNE, ReliefWeb RSS, future JEME/API or authorized feeds
    ├── Global remote feeds and official employer ATS endpoints
    ├── User-provided Simplify tracker/profile imports
    │
    ▼
Fetch → validate provenance → normalize → resolve location and remote eligibility
    │
    ▼
Deduplicate → preserve source link → apply expiry → record source health
    │
    ▼
Public feed + authenticated user feed
    │
    ├── Cameroon Local: map and radius experience
    └── Global Remote: swipe and ApplyFlow experience
```

The deterministic ingestion layer does not submit applications or invent missing facts. The application layer may prepare a CV or answer draft, but final user confirmation is required unless a specific supported integration has been explicitly approved by the user.

## Simplify import plan

Simplify’s documented tracker export/import is CSV-based. JobMap should accept the user’s exported CSV, validate required Company name and Position Title fields, map Location when present, deduplicate against existing applications, and show a preview before saving. This imports the tracker, not necessarily the reusable Simplify profile.

Profile import is a separate flow. JobMap accepts a user-provided resume PDF/DOCX or pasted profile text, extracts candidate fields into a draft, and asks the user to verify every field before it becomes an approved profile version. A future structured Simplify profile import requires a documented export or authorized API. JobMap should never ask for Simplify credentials or access private extension storage. [1]

## Accounts, documents, and privacy

Anonymous discovery is public. Email and Google sign-in are required for saved preferences, cross-device synchronization, uploaded CVs, application packs, applications, and notifications. CV bytes and generated documents belong in private object storage; the database stores metadata and controlled references. Users need consent, access, retention, deletion, account-linking, and disconnect controls.

## Refresh and reliability

The repository workflow currently runs every six hours and can be started manually. Each refresh fetches enabled source adapters and writes `public/jobs.json` and `public/ingestion-meta.json`. Before global launch, add per-source timeout, retry/backoff, concurrency limits, health status, freshness thresholds, and an alert when a source repeatedly fails.

A source failure must not erase valid prior jobs immediately. A posting should remain until its source-specific expiry or a confirmed removal. The UI should expose last verified time and expiry so users can judge freshness.

## Progress tracker

Progress is tracked in [`Product roadmap and progress.md`](Product%20roadmap%20and%20progress.md). The current estimate is **30% overall**, weighted toward the working Cameroon discovery foundation plus the newly implemented Local/Remote mode and PWA foundation. Account persistence, Simplify import, swipe interactions, Application Pack generation, and controlled automation are mostly planned rather than implemented.

## Delivery sequence

| Stage | Deliverable | Exit condition |
|---|---|---|
| Foundation | Reliable source refresh and mobile baseline | Sources are observable, failures are non-destructive, and core flows work on phone screens. |
| PWA | Installable mobile experience | Install, offline saved state, share links, and responsive navigation pass QA. |
| Accounts | Email/Google account and profile | Preferences, documents, and profile versions persist securely across devices. |
| Imports | Simplify tracker CSV and resume/profile import | User sees mappings and confirms before data is saved. |
| Remote | Global remote feed and eligibility | Cameroon-based users see only clearly labelled eligible or uncertain roles. |
| ApplyFlow | Swipe queue, Application Pack, tracker | User can move from match to reviewed application and follow-up status. |
| Automation | Supported API and guided browser handoff | Each integration is permissioned, auditable, reversible, and final-submission controlled. |

## References

[1]: https://help.simplify.jobs/articles/2140179-using-the-job-tracker "Simplify Help: Using the Job Tracker"
[2]: https://emploi.fnecm.org/offres "FNE Cameroon public job offers"
[3]: https://reliefweb.int/jobs/rss.xml?advanced-search=%28C49%29 "ReliefWeb Cameroon Jobs RSS"
