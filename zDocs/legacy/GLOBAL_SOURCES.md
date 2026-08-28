# Global Job Sources: Non-Shortlisted Register

**Updated:** 24 August 2026

## Clarification

The sources below were **not rejected because they are useless**. They were placed outside the first direct-ingestion wave because a public web page alone is not enough for a reliable aggregator. JobMap needs a documented API/RSS feed, a permitted publisher export, a first-party employer feed, or an explicit partnership. The first wave therefore prioritizes sources that returned structured live data and exposed enough fields to preserve canonical links, attribution, freshness, and remote-location evidence.

The remaining sources are still useful for discovery, partnership outreach, employer expansion, or ApplyFlow research. Their current status and recommended next step are recorded here so they are not lost.

## Sources needing a feed, permission, or further verification

| Source | URL | Why it is useful | Current access finding | Recommended next step | Status |
|---|---|---|---|---|---|
| Working Nomads | https://www.workingnomads.com/jobs | Worldwide digital-nomad and remote roles | The public jobs page is available, but the guessed RSS endpoint returned 404; no official feed/API was verified | Ask for an official feed/API or publisher permission; otherwise retain as a link-only source | Pending feed |
| Remote.co | https://remote.co/remote-jobs/ | Broad remote roles across industries | Public listing page returned HTTP 200, but no approved machine endpoint was verified | Check official terms, feed/API availability, or partnership options before automation | Pending access review |
| NoDesk | https://nodesk.co/remote-jobs/ | Work-from-anywhere and remote roles | The guessed RSS endpoint returned 404 and the public response showed bot-protection signals | Request an official feed or permission; do not scrape by default | Pending feed |
| TrulyRemote | https://trulyremote.co/?locations=Africa | Especially valuable for Africa-filtered remote work | Africa filter is publicly visible, but the guessed feed returned 404 and robots disallows `/api/*` | Request a supported feed/API or partnership; preserve Africa/Cameroon eligibility evidence | Pending partnership |
| UNJobs | https://unjobs.org/ | International-organization and UN vacancies | Public directory is available, but the guessed RSS endpoint returned 404 | Verify official feed/API and terms; prefer first-party organization feeds where possible | Pending feed |
| RareRoles | https://www.rareroles.com/ | Curated niche roles that may not appear on large boards | Public site supplied; no machine endpoint verified | Request a publisher feed or permission | Partnership candidate |
| Still Hiring | https://stillhiring.today/ | Curated technology openings | Public site supplied; no machine endpoint verified | Request a feed or permission | Partnership candidate |
| RemoteJobsFinder | https://remotejobsfinder.co/en | Worldwide remote-job discovery | Public page returned HTTP 200, but the response showed bot-protection signals and onboarding is gated | Request an official feed/API or permission; do not access onboarding or private data | Pending access review |
| Wellfound | https://wellfound.com/jobs | Startup roles and distributed companies | Public page returned HTTP 200, but the response showed Turnstile/bot-protection signals and robots restricts internal job paths | Use approved employer ATS links or partnership access; do not broadly scrape | Employer/partner only |
| Built In | https://builtin.com/jobs/remote | Technology jobs and remote filters | Public remote page returned HTTP 200, but the response showed bot-protection signals | Use first-party employer ATS feeds or partnership access | Employer/partner only |
| Flexa | https://flexa.careers/jobs | Flexible-work and remote-work roles | Public page returned HTTP 200, but the response showed bot-protection signals and no feed was verified | Request API/feed access or partnership | Partnership candidate |
| Rat Race Rebellion | https://ratracerebellion.com/ | Work-from-home and remote roles | Public site supplied; no machine endpoint verified | Request a feed or permission and apply a stronger scam-quality review | Partnership candidate |
| Prevetted Recruitment | https://prevettedrecruitment.com/ | Vetted recruitment opportunities | Appears to be a recruitment service rather than a public feed | Partnership only; do not treat as a job board without permission | Partnership only |
| Global Work AI | https://globalwork.ai/en/journey/7/join/3 | Candidate journey and global-work workflow | The supplied link is a candidate journey, not a public listing feed | Keep as ApplyFlow/reference research; do not ingest candidate or account data | Workflow only |
| Top Startups | https://topstartups.io/ | Employer discovery and startup directory | Directory is useful for finding employers but is not itself a vacancy feed | Use only to seed approved employer career-page and ATS research | Directory only |
| Sagan Recruitment | https://saganrecruitment.com/career/ | Roles from one recruiting network | First-party career page supplied; no feed/API verified | Inspect for an official ATS endpoint or request permission | Employer adapter candidate |
| CareerHound | https://www.careerhound.io/jobs/all | General job directory | Supplied URL returned HTTP 404 during live verification; robots allows public paths but disallows onboarding | Revalidate the canonical public URL before any integration | Revalidate URL |
| itsatravelod / wantremotejobs | https://www.itsatravelod.com/find-remote-jobs | Remote-job directory link from the bookmark export | The bookmark label and domain identity require verification before treating it as an established source | Confirm ownership, current listing URL, and feed/API availability | Revalidate identity |

## First-party employer sources

These are valuable because they can improve quality and reduce duplicate aggregation, but they should be added as **targeted employer adapters** rather than treated as global job boards.

| Employer | URL | Recommended integration path | Status |
|---|---|---|---|
| Invisible Technologies | https://www.invisible.co/join-us/ | Identify the first-party ATS or public jobs endpoint and preserve the employer application URL | Employer adapter candidate |
| Nethermind | https://www.nethermind.io/ | Identify the first-party ATS or public jobs endpoint and derive remote eligibility from the employer’s location text | Employer adapter candidate |
| Doubledot Media | https://www.doubledotmedia.com/ | Identify the first-party ATS or public jobs endpoint; add only current vacancies | Employer adapter candidate |
| Lower Street | https://lowerstreet.co/ | Identify the first-party ATS or public jobs endpoint and preserve the canonical employer URL | Employer adapter candidate |
| Orange Cameroon | https://orangecameroun.taleo.net/careersection/in/joblist.ftl | Validate whether a public Taleo feed is enabled before automation | Cameroon employer candidate |

## Workflow and account destinations

These entries should not be scraped or accessed as job sources because they represent personal accounts, onboarding flows, private dashboards, or application tools.

| Product or destination | URL | JobMap treatment |
|---|---|---|
| Simplify preferences | https://simplify.jobs/preferences | Import only user-provided profile/CV data or an approved export; never request Simplify credentials. |
| Simplify tracker | https://simplify.jobs/tracker | Support user-provided tracker CSV import; preserve application statuses and source links. |
| Alignerr | https://app.alignerr.com/home | Candidate workflow/reference only; no private-account access. |
| CareerWhiz | https://www.careerwhiz.ai/ | Application-service reference only; not a source feed. |
| AutoApply.Jobs | https://www.autoapply.jobs/home | Application-automation reference only; not a source feed. |
| Smile & Hire | https://www.smileandhire.com/va/dashboard | Private candidate dashboard; do not access or ingest. |
| micro1 | https://www.interview.micro1.ai/start/micro1/ | Candidate-specific interview link; do not ingest. |

## Why these sources are not activated yet

A source can be publicly viewable and still be unsafe or unreliable to automate. The main blockers are missing structured access, unclear reuse terms, bot-protection or account gating, stale/cross-posted records, and insufficient geographic eligibility fields. JobMap should not defeat bot protection, use private account sessions, submit applications on a source’s behalf without explicit user action, or represent a directory record as a verified vacancy.

The next expansion wave should be driven by publisher responses and employer ATS discovery. For each approved addition, JobMap should record the owner, canonical source URL, machine endpoint, terms state, coverage, refresh expectation, field completeness, eligibility evidence, expiry policy, dedupe key, attribution text, and failure contact.

## Current activated global sources

For comparison, the first direct-ingestion wave currently consists of **Jobicy API, Remotive API, Remote OK API, and We Work Remotely RSS**. Their adapters preserve canonical links and expose source-trust and remote-eligibility metadata. See [`data/source-candidates.json`](../data/source-candidates.json) and [`zDocs/Global remote source datasheet.md`](../zDocs/Global%20remote%20source%20datasheet.md) for the full inventory and evidence.

## References

[1]: https://jobicy.com/jobs-rss-feed "Jobicy Remote Jobs API and RSS Feed"
[2]: https://remotive.com/remote-jobs/api "Remotive Remote Jobs Public API"
[3]: https://remoteok.com/api "Remote OK public API"
[4]: https://weworkremotely.com/remote-jobs.rss "We Work Remotely public RSS feed"
