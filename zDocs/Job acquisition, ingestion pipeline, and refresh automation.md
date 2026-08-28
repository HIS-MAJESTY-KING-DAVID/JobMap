# Job Ingestion, Ingestion Pipeline & Refresh Automation Reference

**Last updated:** 28 August 2026  
**Status:** Operational scheduled 6-hour refresh workflow, FNE/ReliefWeb adapters, and Supabase integration.

---

## 1. Ingestion Pipeline Overview

JobMap treats job acquisition as a decoupled **source pipeline**, not as logic embedded in the client.
- The frontend consumes a static, stable, normalized feed from `public/jobs.json`.
- Upstream source adapters fetch, normalize, and publish this feed periodically.
- Ingestion metadata is output to `public/ingestion-meta.json` (listing generation timestamp, healthy job counts, and source errors).

```
Cameroon registry (data/sources.json)
        │
        ├── Local sources: FNE HTML crawler, ReliefWeb RSS, Greenhouse/Lever ATS
        ├── Global sources: Jobicy, Remotive, Remote OK, We Work Remotely
        ▼
Fetch → Validate provenance → Normalize → Calculate Location coordinates & remote eligibility
        │
        ▼
Deduplicate → Expiry cleanup (remove elapsed) → Update lastVerifiedAt
        │
        ▼
Publish static feed files (public/jobs.json + public/ingestion-meta.json)
        │
        ▼
Sync to Database (upsert active jobs into public.jobs table)
```

---

## 2. Source Strategy

### Local Source Lanes (Cameroon Local)
- **FNE Public Employment Service:** Custom HTML scraper. Enforces bounded page sizes and concurrency limits. Fetches only the listings page and crawls the detail page to capture the posting description and source-provided expiry date. It preserves official detail URLs.
- **ReliefWeb Cameroon RSS:** Cameroon country-filtered humanitarian and development jobs. Uses low-friction RSS XML feed fetching as a fallback.
- **ReliefWeb v2 API:** Designed and implemented but disabled. The API requires a pre-approved developer `appname` in the request headers; a placeholder value will trigger an explicit source error.
- **Greenhouse & Lever Public Boards:** Normalizes location filters and extracts company listings. Added per-company as specific ATS adapters.
- **Other Local Candidates (Emploi.cm, MINEFOP, Orange Taleo):** Classified as pending. These require permission reviews or feed confirmation before automation can be enabled.

### Determinism & Expiry
The pipeline is strictly deterministic. If a source fails to fetch, existing jobs are preserved until their source-specific `expiresAt` or a verified removal, avoiding feed wipeouts during temporary outages.
- Coordinates fallback: If a posting lacks coordinates but lists a city or region, the system estimates the location using a coordinates database and marks it `locationConfidence: estimated`. If the source provides exact coordinates, it is marked `source`.

---

## 3. GitHub Actions Scheduled Refresh

The automated refresh runs at **17 minutes past every sixth hour** (`17 */6 * * *`) via GitHub Actions: `.github/workflows/refresh-jobs.yml`. It can also be triggered manually.

### Workflow Sequence
1. **Validate:** Runs the project smoke tests.
2. **Ingest:** Executes the script (`node scripts/ingest.js`) to parse all enabled sources inside `data/sources.json`.
3. **Deduplicate & Expire:** Deduplicates postings by normalized title, company, and location. Removes expired entries.
4. **Publish:** Writes `public/jobs.json` and `public/ingestion-meta.json`.
5. **Sync Database:** Hydrates active jobs to Supabase. Requires the database worker script and the secret `SUPABASE_SERVICE_ROLE_KEY`.
6. **Commit:** Commits and pushes the static feed back to the repository if changes exist, triggering the hosting platform's build rebuild.

---

## 4. Onboarding New Sources

1. **Candidate Verification:** Candidates reside in `data/source-candidates.json`. They are only moved to `data/sources.json` after endpoint testing, terms check, and payload verification.
2. **Configuration Schema:** Sources in `data/sources.json` require:
   - `id`: Unique source identifier.
   - `name`: Display name.
   - `enabled`: Boolean status.
   - `adapter`: Adapter type (e.g. `rss`, `jobicy`, `fne`).
   - `url`: Target endpoint or feed path.
3. **Safety Constraints:** Adapters must never bypass access controls, request user credentials, or scrape authenticated areas. generic rate-limiting andPerHour count checks must be enforced.

---

## 5. Alerts & Notification Architecture

While the frontend currently saves searches locally and displays notifications in-browser, production-scale continuous alerts require:
- An authenticated user backend with consented delivery channels (e.g. email).
- A saved-search table matching criteria (radius, title, location) to jobs.
- A post-ingestion matching worker that checks newly normalized jobs against active criteria.
- De-duplication of notification deliveries and unsubscribe linkages.
