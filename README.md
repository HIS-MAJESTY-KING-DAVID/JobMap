# JobMap

JobMap is a **Cameroon-wide, location-aware job-discovery map**. It helps job seekers search current openings by title, employer, skill, city, region, work mode, employment type, and distance. Users can move between a result card, its geographic context, the original source listing, and a richer job detail panel.

## Current product scope

The first release is a job-posting map, not a directory of businesses that may or may not be hiring. The interface supports All Cameroon browsing, major-city selection across the regions, radius filtering, title/company/skill/location search, work-mode and employment filters, synchronized map markers, detailed source-linked job views, saved openings, saved searches, a global remote Swipe queue, account-based profile/CV storage, user-confirmed ApplyFlow packs, tracker receipts, source-health visibility, and an installable offline-aware PWA shell.

The current published feed is generated from seven enabled source adapters spanning Cameroon and global remote roles. The ingestion contract preserves provenance, freshness, expiry, and source-health state; source breadth expands through the registry and adapter workflow described below.

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
npm run test:production
```

## Refresh the feed locally

```bash
npm run ingest
```

The ingestion command reads `data/sources.json`, fetches enabled public sources, normalizes records into the frontend contract, estimates coordinates only when the source provides a city or region fallback, deduplicates postings, removes expired roles, and writes:

- `public/jobs.json` — the feed consumed by the map.
- `public/ingestion-meta.json` — generated time, job count, source status, and errors.

## Source expansion

The source registry now supports Greenhouse, Lever, approved RSS/Atom feeds, and a first-class ReliefWeb v2 adapter for Cameroon humanitarian and development jobs. The ReliefWeb adapter is approval-gated because the current API requires a pre-approved appname. It must not be enabled with a placeholder value.

Potential additional source candidates are documented in [`data/source-candidates.json`](data/source-candidates.json). Orange Cameroon’s public Taleo board is recorded as an employer source awaiting validation of its machine-readable feed endpoint. The ingestion system deliberately does not scrape arbitrary HTML search-result pages; each source must have an approved public endpoint or feed and clear provenance.

| Adapter | Configuration | Current status |
|---|---|---|
| ReliefWeb v2 | `appname` plus Cameroon country filter | Implemented; requires approved appname before enabling. |
| Greenhouse | `boardToken` | Implemented; add verified employer board tokens. |
| Lever | `site` | Implemented; add verified employer site names. |
| RSS / Atom | `url` | Implemented; add approved local employer, NGO, university, or job-board feeds. |
| Orange/Taleo | Feed endpoint to be verified | Candidate only; do not enable until endpoint and usage terms are confirmed. |

## Accounts, saved work, and ApplyFlow

Discovery remains public. Authentication is required for portable profile preferences, private CV storage, cloud-synced Saved openings, Application Packs, tracker records, and account lifecycle controls. Local-first storage remains the fallback when the network is unavailable. ApplyFlow prepares source-backed safe fields, pauses sensitive/legal/unknown fields, supports a narrowly allowlisted browser handoff for approved employer routes, and requires explicit user confirmation before a submission receipt is recorded. Browser notifications cover opt-in new-match and follow-up reminders; email evidence sync remains an optional future connector.

## Automatic updates

`.github/workflows/refresh-jobs.yml` runs every six hours and can also be triggered manually. It installs dependencies, runs the ingestion script, publishes the refreshed feed and metadata, and commits only when the generated data changes. A static deployment connected to the repository can then rebuild or serve the updated nationwide feed.

The scheduled workflow uses bounded retries, explicit feed headers, source-level health reports, a six-hour refresh, expiry removal, and a bounded FNE public-page fetch so one slow publisher cannot stall the entire run. A separate daily retention workflow requires a Supabase service-role secret and purges due deletion requests only after the documented 90-day window. Keep the frontend consuming the same normalized fields so the infrastructure can evolve independently.

## Data contract

Each opening can include `id`, `title`, `company`, `location`, `city`, `region`, `country`, `lat`, `lng`, `description`, `url`, `applyUrl`, `source`, `sourceUrl`, `postedAt`, `lastVerifiedAt`, `expiresAt`, `employmentType`, `workMode`, `salary`, `status`, `locationConfidence`, and `tags`.

The pipeline preserves postings during temporary source failures and expires them only after their configured TTL. This prevents a transient upstream error from wiping the map while still preventing indefinitely stale roles.
