# JobMap

JobMap is a **Cameroon-wide, location-aware job-discovery map**. It helps job seekers search current openings by title, employer, skill, city, region, work mode, employment type, and distance. Users can move between a result card, its geographic context, the original source listing, and a richer job detail panel.

## Current product scope

The first release is a job-posting map, not a directory of businesses that may or may not be hiring. The interface supports All Cameroon browsing, major-city selection across the regions, radius filtering, title/company/skill/location search, work-mode and employment filters, synchronized map markers, detailed source-linked job views, saved openings, saved searches, and a browser-local “Notify me” preference.

The current published feed still contains the five curated Douala records from the original prototype until verified external sources are configured. The user experience and ingestion contract are nationwide-ready; source breadth now expands through the registry and adapter workflow described below.

## Run locally

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The production checks are:

```bash
npm run lint
npm run build
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

## Saved openings, searches, and alerts

Saved openings and searches are currently stored in the browser’s local storage, so the experience works without authentication or a backend. “Notify me” records a local preference and establishes the user-facing contract for alerts. The next production step is to move saved searches and alert delivery to a backend with user accounts, email or messaging delivery, and a scheduled matcher that compares new normalized jobs against saved criteria.

## Automatic updates

`.github/workflows/refresh-jobs.yml` runs every six hours and can also be triggered manually. It installs dependencies, runs the ingestion script, publishes the refreshed feed and metadata, and commits only when the generated data changes. A static deployment connected to the repository can then rebuild or serve the updated nationwide feed.

At larger scale, move the same adapter and normalization logic into a hosted backend with a database, source-health monitoring, retry queues, raw-record history, a review queue for uncertain locations, and user-specific alert delivery. Keep the frontend consuming the same normalized fields so the infrastructure can evolve independently.

## Data contract

Each opening can include `id`, `title`, `company`, `location`, `city`, `region`, `country`, `lat`, `lng`, `description`, `url`, `applyUrl`, `source`, `sourceUrl`, `postedAt`, `lastVerifiedAt`, `expiresAt`, `employmentType`, `workMode`, `salary`, `status`, `locationConfidence`, and `tags`.

The pipeline preserves postings during temporary source failures and expires them only after their configured TTL. This prevents a transient upstream error from wiping the map while still preventing indefinitely stale roles.
