# JobMap product direction

## Core value proposition

JobMap helps people find **current job openings in places they care about**. The first release treats geography as a primary search dimension: users see roles in a list, locate them on a map, and open the original source listing.

## Data Strategy (API-based approach brainstorm)

**Primary Data Source**: Public Job APIs
- **Remotive API**: For remote tech jobs (`https://remotive.com/api/remote-jobs`).
- **Arbeitnow API**: For jobs in Europe (`https://www.arbeitnow.com/api/job-board-api`).
- **Nominatim (OpenStreetMap)**: For geocoding location strings to coordinates (`https://nominatim.openstreetmap.org`).

**Reference Repository**:
- **Public APIs List**: Source for finding free APIs (`https://github.com/public-apis/public-apis`).

**Secondary Source**: Google Maps Places API
- Use to enrich company data (ratings, exact address) once a job is selected.

**Workflow**:
1. Fetch jobs from Remotive/Arbeitnow.
2. Geocode location strings (e.g., "Berlin") to Lat/Lng using Nominatim.
3. Display markers on the map.
4. On click, show job details.

## First-release boundary

JobMap is a **job-posting map**, not a directory of businesses that may or may not be hiring. A role is eligible for the map only when it has an application or source URL. Each record should carry its source, posted date where available, last verification time, expiry time, and coordinates or an explicitly reviewable location fallback.

## Data strategy

The first ingestion layer uses public, source-specific endpoints rather than scraping search-result pages. Supported adapter families are Greenhouse public job boards, Lever public postings, and approved RSS/Atom feeds. Sources are configured in `data/sources.json`; the scheduled refresh writes `public/jobs.json`, which the static frontend consumes.

## User experience

The current vertical slice includes a map-and-results layout, title/company/skill/location search, work-mode and employment filters, synchronized marker selection, source links, empty and loading states, and freshness metadata. The next user-facing improvements should be radius or commute filtering, a city selector, richer job details, and saved searches.

## Architecture roadmap

1. **Now:** Static frontend plus repository-native scheduled ingestion, with deterministic normalization, deduplication, TTL-based expiry, and source health metadata.
2. **Next:** Add a verified employer/source registry for Douala and nearby cities, then review the quality and freshness of each source.
3. **Scale:** Move adapters and normalized records into a hosted backend/database with retries, raw-record history, review queues, source-health monitoring, and an API consumed by the same frontend contract.
4. **Later:** Add user accounts, saved searches, alerts, commute-time calculations, and additional cities once the core data supply is reliable.

## Open validation questions

- Which sources consistently produce legitimate Douala openings?
- Do users prioritize current vacancies, employer discovery, commute time, salary, or application guidance?
- What freshness window feels trustworthy for each source family?
- Which fields should be required before a role is published?
