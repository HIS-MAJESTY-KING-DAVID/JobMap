# JobMap acquisition and continuous update plan

JobMap should treat job acquisition as a **source pipeline**, not as logic embedded in the map. The frontend reads a stable `public/jobs.json` contract. Upstream source adapters produce normalized postings, and a scheduled refresh publishes the newest active set.

## Product contract

The first release is a **job-posting map**. Every opening should carry a title, employer, location, coordinates, application URL, source, posting date where available, last verification time, and expiry time. If a source only identifies an employer without an active vacancy, it should not be presented as an open job.

## Two viable operating models

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| Repository-native refresh | A scheduled script fetches configured Greenhouse, Lever, or RSS/Atom sources, writes the static feed, and commits only changes. Very cheap and easy to inspect, but depends on source configuration and repository workflows. | Low; uses the repository’s existing automation allowance. | Low |
| Hosted ingestion service | A backend worker stores raw and normalized records in a database, tracks source health, preserves history, retries failures, exposes an API, and supports an admin screen. Better for many sources, alerting, analytics, and user-specific radius searches, but requires hosting, secrets, schema migrations, and operations. | Usage-based hosting and database cost. | Medium to high |

The repository now implements the **first model** because it matches the current static app and creates a clean vertical slice without prematurely adding a database. When the number of sources, cities, or refresh frequency grows, the same normalized contract can move behind a hosted API without rewriting the map UI.

## Current pipeline

```text
Configured source registry
        │
        ├── Greenhouse public job board endpoint
        ├── Lever public postings endpoint
        └── RSS / Atom feed
        │
        ▼
Fetch → normalize → add location coordinates → deduplicate
        │
        ▼
Preserve unseen records until expiry → publish public/jobs.json
        │
        ▼
Frontend fetches the feed → filters → map + results cards
```

The script is intentionally deterministic. It does not scrape search-result pages, submit applications, or invent missing facts. A source adapter may be added only when the source provides a stable public endpoint or an explicitly authorized feed.

## How new sources enter the system

Edit `data/sources.json` and add a source entry. Greenhouse requires a board token, Lever requires the public site name, and RSS/Atom requires a feed URL. Set `enabled` to `true` only after verifying that the source is allowed to be consumed and that its location data is useful. The current registry keeps examples disabled so the default build cannot depend on an unverified third-party endpoint.

For a Douala launch, start with a small employer registry of companies that are known to hire locally. Add their public Greenhouse or Lever board identifiers when available, then add approved local RSS/Atom feeds. This is better than broad scraping because it keeps provenance clear and gives you a source-by-source quality check.

## Data quality rules

The pipeline creates a stable identifier from the source and external posting ID where available. It also deduplicates using normalized title, company, and location. Each successful fetch updates `lastVerifiedAt`. Postings are removed only after `expiresAt`, so a temporary upstream outage does not erase the map. Source errors are written to `public/ingestion-meta.json` for inspection.

The next production improvements should be a durable database, a raw-record archive, per-source retry/backoff, a review queue for uncertain locations, and a source-health dashboard. The frontend should continue consuming the same fields so that this infrastructure can be upgraded independently.

## Automatic refresh

`.github/workflows/refresh-jobs.yml` runs the ingestion script every six hours and can also be started manually. It installs dependencies, fetches enabled sources, publishes `public/jobs.json`, writes ingestion metadata, and commits only when the feed changes. A static deployment that rebuilds on repository pushes will therefore receive the updated map automatically.

For a higher-frequency or larger-scale system, move the worker and storage to a hosted backend with a scheduled job. Keep the repository workflow as a fallback or nightly export. Do not put API keys in the frontend; source credentials, if a provider ever requires them, belong in server-side secrets.

## Official source references

- [Greenhouse Job Board API overview](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview)
- [Greenhouse Job Board API documentation](https://developers.greenhouse.io/job-board.html)
- [Lever developer documentation](https://hire.lever.co/developer/documentation)
- [GitHub Actions scheduled workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
