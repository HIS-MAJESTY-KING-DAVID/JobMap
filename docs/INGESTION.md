# JobMap Cameroon-wide acquisition and continuous update plan

JobMap treats job acquisition as a **source pipeline**, not as logic embedded in the map. The frontend reads a stable `public/jobs.json` contract. Upstream source adapters produce normalized postings, and a scheduled refresh publishes the newest active national set.

## Product contract

The first release is a **Cameroon-wide job-posting map**. Every opening should carry a title, employer, location, coordinates, application URL, source, posting date where available, last verification time, and expiry time. If a source only identifies an employer without an active vacancy, it should not be presented as an open job.

The UI now adds a city registry covering All Cameroon and major cities across the regions, radius filtering, richer job details, saved openings, saved searches, and a local notification preference. The frontend can therefore accept a national feed immediately, while the source network grows independently.

## Source strategy

| Source family | Coverage | Automation state | Next action |
|---|---|---|---|
| ReliefWeb v2 Jobs API | Cameroon-wide humanitarian and development roles | Adapter implemented but approval-gated | Request an approved appname from ReliefWeb, add it to `sources.json`, then enable the source. |
| Greenhouse public boards | Employer-specific; location fields may span Cameroon | Adapter implemented | Add verified board tokens for employers with Cameroon roles. |
| Lever public postings | Employer-specific; location fields may span Cameroon | Adapter implemented | Add verified public site names for employers with Cameroon roles. |
| RSS/Atom | Local job boards, NGOs, universities, and employers that publish feeds | Adapter implemented | Collect and validate publisher feeds one by one. |
| Orange Cameroon Taleo | Public employer board with current CM-Cameroon and regional roles | Candidate source | Verify a stable public feed or supported endpoint before enabling automation. |

The source candidate inventory lives in [`data/source-candidates.json`](../data/source-candidates.json). It intentionally separates promising public pages from machine-readable feeds that are ready for scheduled ingestion. The ingestion worker does not scrape arbitrary HTML result pages or bypass access controls.

## ReliefWeb approval requirement

ReliefWeb’s current v2 documentation says the API is publicly accessible but requires a pre-approved `appname`. The `reliefweb-cameroon` source is therefore disabled with a placeholder value. Running the adapter without an approved appname records a clear source error instead of silently failing or using an unapproved identity.

Once approved, the source query should use the jobs resource, a Cameroon country filter, the latest preset, and a bounded page size. The normalized records retain the ReliefWeb URL and organization metadata, so users can verify each opening at the source.

## Current pipeline

```text
Cameroon source registry
        │
        ├── ReliefWeb v2 jobs API
        ├── Greenhouse public employer boards
        ├── Lever public employer boards
        └── approved RSS / Atom feeds
        │
        ▼
Fetch → normalize → resolve city/region coordinates → deduplicate
        │
        ▼
Preserve unseen records until expiry → publish jobs.json + ingestion metadata
        │
        ▼
Frontend fetches national feed → city/radius filters → map + result cards
```

The script is deterministic. It does not submit applications, invent missing facts, or claim that an employer is hiring merely because the employer exists. When a source gives only a region or city, the record is marked with `locationConfidence: estimated`; source-provided coordinates or locations are marked `source`.

## How new sources enter the system

Add a source entry to `data/sources.json` with an adapter type, label, location scope, default location, and source-specific configuration. Keep `enabled` false until the endpoint has been tested, the publisher’s terms have been reviewed, and the returned records contain enough fields for a trustworthy opening. Source errors and counts are written to `public/ingestion-meta.json`.

The recommended onboarding sequence is to start with official employer boards and public institutional feeds in each region, then add carefully selected aggregators only when their terms and freshness are clear. For each new source, record its owner, endpoint, refresh expectation, location coverage, deduplication key, expiry policy, and failure contact in the source registry or a future admin database.

## Freshness and deduplication

The pipeline creates a stable identifier from the source and external posting ID where available. It also deduplicates using normalized title, company, and location. Each successful fetch updates `lastVerifiedAt`. Postings are removed only after `expiresAt`, so a temporary source outage does not erase the map. The default TTL is intentionally conservative and should become source-specific as the registry matures.

At production scale, add a raw-record archive, per-source retry and backoff, source-health monitoring, a review queue for uncertain locations, and an audit trail for removals and corrections. The frontend should continue consuming the same normalized fields.

## Saved searches and alerts

The current browser implementation stores saved openings and saved searches locally. The “Notify me” control records the user preference but does not send messages yet. Production alerts require a backend with user accounts or an explicitly consented delivery address, a saved-search table, a scheduled matcher that compares newly ingested jobs to saved criteria, deduplication of notifications, unsubscribe controls, and delivery logs. Email is the simplest first channel; SMS or WhatsApp should be added only after opt-in, provider, cost, and compliance requirements are settled.

## Automatic refresh

`.github/workflows/refresh-jobs.yml` runs the ingestion script every six hours and can also be started manually. It installs dependencies, fetches enabled sources, publishes `public/jobs.json`, writes ingestion metadata, and commits only when the feed changes. A static deployment connected to the repository can then rebuild or serve the updated nationwide feed.

For more sources, more frequent updates, user-specific alerts, or durable history, move the worker and storage to a hosted backend with a scheduled job. Keep the repository workflow as a fallback or nightly export. Never put provider credentials in the frontend; API keys and approved appnames belong in server-side secrets.

## References

- [ReliefWeb API help](https://reliefweb.int/help/api)
- [ReliefWeb v2 endpoints](https://apidoc.reliefweb.int/endpoints)
- [ReliefWeb v2 request parameters](https://apidoc.reliefweb.int/parameters)
- [Greenhouse Job Board API overview](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview)
- [Greenhouse Job Board API documentation](https://developers.greenhouse.io/job-board.html)
- [Lever developer documentation](https://hire.lever.co/developer/documentation)
- [Orange Cameroon public career board](https://orangecameroun.taleo.net/careersection/in/joblist.ftl)
- [GitHub Actions scheduled workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
