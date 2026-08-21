# JobMap

JobMap is a location-aware job-posting map for discovering openings around Douala and, later, other cities. It pairs a searchable results panel with a Leaflet map so users can move between a role and its physical context before opening the source listing.

## Current product slice

The current prototype supports searching by title, company, skill, or location; filtering by work mode and employment type; selecting a result to focus its map marker; opening the original application listing; and showing the last verified date of the published feed. The default feed contains curated Douala examples so the interface remains usable before external sources are configured.

This is intentionally a **job-posting map**, not a map of businesses that may or may not be hiring. Every external opening should be accompanied by its source URL and freshness metadata.

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

The ingestion command reads `data/sources.json`, fetches enabled public sources, normalizes records into the frontend contract, deduplicates them, removes expired postings, and writes:

- `public/jobs.json` — the feed consumed by the map.
- `public/ingestion-meta.json` — generated time, job count, source status, and errors.

Sources are disabled by default until their identifiers and URLs have been verified. See [`docs/INGESTION.md`](docs/INGESTION.md) for the acquisition model, source configuration, freshness rules, and the hosted-service upgrade path.

## Automatic updates

The repository contains `.github/workflows/refresh-jobs.yml`. Once enabled sources are added, GitHub Actions runs the ingestion workflow every six hours and can also be triggered manually. It commits only when the generated feed changes, allowing a static deployment connected to the repository to pick up updated openings automatically.

The workflow currently supports three adapter families:

| Adapter | Configuration | Intended use |
|---|---|---|
| Greenhouse | `boardToken` | Public Greenhouse job boards. |
| Lever | `site` | Public Lever postings boards. |
| RSS / Atom | `url` | Approved feeds from local boards, communities, or employers. |

For a larger network of sources or more frequent refreshes, move the same adapter and normalization code into a hosted backend with a database, source-health monitoring, and a review queue. The frontend can continue consuming the same normalized fields.

## Data contract

Each opening can include `id`, `title`, `company`, `location`, `city`, `country`, `lat`, `lng`, `description`, `url`, `applyUrl`, `source`, `sourceUrl`, `postedAt`, `lastVerifiedAt`, `expiresAt`, `employmentType`, `workMode`, and `tags`.

The pipeline preserves postings during temporary source failures and expires them only after their configured TTL. This avoids making the map disappear when one provider has a transient outage, while still preventing indefinitely stale roles.
