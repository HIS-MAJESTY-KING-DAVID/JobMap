# Global Remote & Unused Job Sources Datasheet

**Last updated:** 28 August 2026  
**Status:** Ingestion enabled for 4 priority global feeds; 16 candidates and 4 ATS formats registered.

---

## 1. Decision Summary & Active Global Feeds

The initial wave prioritizes global feeds that expose structured fields and preserve canonical links, attribution, freshness, and geo-eligibility.

| Source | Category | Target API or Endpoint | Ingestion Rule | Priority |
|---|---|---|---|---:|
| **Jobicy** | Job Board | `https://jobicy.com/api/v2/remote-jobs?count=100` | Exposes geo, type, and salary. Requires visible attribution. Limit polling to a few times daily (max hourly). | P0 |
| **Remotive** | Job Board | `https://remotive.com/api/remote-jobs?limit=100` | Exposes remote tags. Requires direct attribution and no third-party middle-man submissions. | P0 |
| **Remote OK** | Job Board | `https://remoteok.com/api` | Exposes category, salary, and location. Requires source mention and follow links. | P0 |
| **We Work Remotely** | Job Board | `https://weworkremotely.com/remote-jobs.rss` | RSS XML feed is parsed directly. Classify locations to isolate Cameroon-eligible roles. | P0 |

---

## 2. Pending Candidates (Unused & Non-Ingested)

These sources are registered in the Supabase database with `enabled = false`. They are preserved for link-only searches or future integrations, but are **not** ingested automatically due to bot protection, missing feeds, or licensing policies.

| Source | Target URL | Database Status | Reason for Pause / Block |
|---|---|---|---|
| **Working Nomads** | `https://www.workingnomads.com/jobs` | `candidate-no-feed-verified` | Guessed RSS returned 404; public page scraping is not approved. |
| **Remote.co** | `https://remote.co/remote-jobs` | `candidate-no-feed-verified` | No feed/API verified. Public pages are blocked from crawling. |
| **NoDesk** | `https://nodesk.co/remote-jobs/` | `candidate-bot-protection` | guested RSS endpoint returned 404; bot-protection active. |
| **TrulyRemote** | `https://trulyremote.co/?locations=Africa` | `candidate-no-feed-verified` | Guessed feed returned 404; robots.txt restricts `/api/*`. |
| **UNJobs** | `https://unjobs.org/` | `candidate-no-feed-verified` | Guessed RSS returned 404. Direct agency feeds preferred. |
| **RareRoles** | `https://www.rareroles.com/` | `candidate-no-feed-verified` | Curated niche site; lacks machine feed. |
| **Still Hiring** | `https://stillhiring.today/` | `candidate-no-feed-verified` | Curated tech board; lacks machine feed. |
| **RemoteJobsFinder** | `https://remotejobsfinder.co/en` | `candidate-bot-protection` | Bot protection active; onboarding flow is gated. |
| **Built In** | `https://builtin.com/jobs/remote` | `candidate-bot-protection` | Bot protection active; search is account-restricted. |
| **Wellfound** | `https://wellfound.com/jobs` | `candidate-bot-protection` | Turnstile protection active; robots.txt disallows `/jobs/` index. |
| **Flexa** | `https://flexa.careers/jobs` | `candidate-bot-protection` | Bot protection active; lacks structured API access. |
| **Rat Race Rebellion** | `https://ratracerebellion.com/` | `candidate-no-feed-verified` | Lacks public feed; needs strict manual filtering. |

---

## 3. Employer Career Pages & ATS Formats

First-party employer postings improve data quality and prevent duplicates. They are targeted as individual employer ATS adapters rather than broad job boards.

### Dedicated Employer Candidates
- **Invisible Technologies** (`https://www.invisible.co/join-us/`): Targeted employer candidate.
- **Nethermind** (`https://www.nethermind.io/`): Blockchain/software roles. Derive eligibility from job text.
- **Doubledot Media** (`https://www.doubledotmedia.com/`): Targeted candidate.
- **Lower Street** (`https://lowerstreet.co/`): Targeted candidate.
- **Orange Cameroon Taleo** (`https://orangecameroun.taleo.net/careersection/in/joblist.ftl`): Local onsite candidate.

### Supported ATS Formats
- **Greenhouse public boards:** Active. Normalizes local/remote locations.
- **Lever public boards:** Active. Leverages public `/v1/postings/` endpoint.
- **Ashby public API:** Ingestion-ready. Exposes `workplace` type, compensation, and apply links.
- **SmartRecruiters public API:** Ingestion-ready. Requires employer API key mapping.

---

## 4. Non-Ingestion Workflow & Account Destinations

These sites represent personal accounts, private dashboards, competitor services, or interview platforms. **They must never be crawled, scraped, or automated as job sources.**

- **Simplify Preferences / Tracker:** Personal application and profile workspace. JobMap supports user-provided CSV exports and profile file imports only. Credentials or extension storage are never accessed.
- **Alignerr** (`https://app.alignerr.com/home`): Authenticated candidate dashboard.
- **Smile & Hire** (`https://www.smileandhire.com/va/dashboard`): Authenticated VA dashboard.
- **micro1** (`https://www.interview.micro1.ai/start/micro1/`): Unique candidate interview/assessment links.
- **AutoApply.Jobs / CareerWhiz:** Competitor auto-apply workflow sites. Registered for product comparison only.

---

## 5. Normalization Fields

Every remote posting normalized by the ingestion script should populate the following fields to facilitate the ApplyFlow and mapping filters:

### Registry fields
- `owner`: Source publisher display name.
- `canonicalSourceUrl`: Original listing URL.
- `machineEndpoint`: API endpoint used for fetching.
- `accessMethod`: E.g. `api`, `rss`.
- `termsState`: Approved/permissioned status.
- `dedupeKey`: Composed key (e.g. `source_id:external_id`).

### Normalization metadata
- `remoteEligibility`: Classified as `cameroon-eligible`, `africa-eligible`, `worldwide`, `restricted`, or `unclear`.
- `eligibleCountries`: Array of allowed countries.
- `excludedCountries`: Array of explicitly banned countries.
- `timezoneOverlap`: Timezone range (e.g. WAT, GMT).
- `salaryMin` / `salaryMax` / `salaryCurrency` / `salaryPeriod`: Salary fields.
- `languageRequirements`: E.g. English, French.
- `workAuthorization`: Expected visa/nationality terms.
- `sourceTrust`: Trusted signal level (`verified`, `unverified`, `public-feed`, etc.).
- `lastVerifiedAt` / `expiresAt`: Freshness timestamps.
