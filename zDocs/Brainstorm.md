# JobMap Cameroon-wide product direction

## Core value proposition

JobMap helps people find **current job openings across Cameroon**. Geography is a primary search dimension: users choose All Cameroon or a city, optionally narrow by radius, inspect roles in a list and on a map, and open the original source listing.

## First-release boundary

JobMap is a **job-posting map**, not a directory of businesses that may or may not be hiring. A role is eligible for publication only when it has an application or source URL. Each record should carry its source, posting date where available, last verification time, expiry time, and either source-provided coordinates or a clearly marked city/region estimate.

## Data strategy

The national ingestion layer uses public, source-specific endpoints rather than arbitrary search-result scraping. Supported adapter families are ReliefWeb v2, Greenhouse public job boards, Lever public postings, and approved RSS/Atom feeds. The source registry distinguishes ready, configuration-required, verification-required, and approval-required sources.

Orange Cameroon’s public Taleo board is a promising employer source because it exposes current public openings and Cameroon regional locations, but it remains a candidate until its machine-readable feed endpoint is verified. ReliefWeb is implemented but requires an approved appname before activation.

## User experience

The current vertical slice includes national city selection, radius filtering, title/company/skill/location search, work-mode and employment filters, synchronized marker selection, source-linked job details, location provenance, saved openings, saved searches, and browser-native alert permission with deduplicated matching for newly loaded openings.

## Architecture roadmap

1. **Now:** Static frontend plus repository-native scheduled ingestion, deterministic normalization, deduplication, TTL expiry, location fallback, and source-health metadata.
2. **Next:** Add verified employer and institutional feeds for each region, activate the approved ReliefWeb adapter, and monitor coverage and freshness by source.
3. **Scale:** Move adapters and normalized records into a hosted backend/database with retries, raw-record history, review queues, source-health monitoring, and an API consumed by the same frontend contract.
4. **Later:** Add authenticated accounts, server-side email/SMS/WhatsApp alerts, salary intelligence, commute-time estimates, employer tools, and analytics.

## Open validation questions

- Which approved sources consistently produce legitimate openings in each Cameroon region?
- How should remote roles be represented in city and radius searches?
- What freshness window is trustworthy for each source family?
- Which fields should be mandatory before a role is published?
