# JobMap Global Remote Source Datasheet

**Status:** Research baseline

**Updated:** 24 August 2026

**Purpose:** Track worldwide remote-job sources supplied by the product owner or discovered during research, and decide which sources are suitable for trustworthy, attributable, automated discovery in JobMap.

## Decision summary

The first direct-ingestion wave should prioritize **Jobicy API**, **Remotive API**, **Remote OK API**, and **We Work Remotely RSS**. These sources expose structured or feed-based listings and can preserve canonical source URLs. Remotive requires visible attribution, direct links, and compliance with restrictions on third-party submission and lead capture. Jobicy requires attribution, caching/fair use, and polling no more frequently than once per hour. Remote OK requires a follow link and source mention. We Work Remotely’s direct RSS endpoint currently responds successfully and should be used instead of attempting to scrape its web pages.

The second wave should focus on **Working Nomads, Remote.co, NoDesk, TrulyRemote, UNJobs, Wellfound, Flexa, Built In, RareRoles, and Still Hiring**, but only after each source provides a documented feed/API or written permission. Employer career pages such as Invisible, Nethermind, Doubledot Media, and Lower Street are valuable for targeted employer adapters, not broad aggregators.

Simplify, Alignerr, CareerWhiz, AutoApply.Jobs, Smile & Hire, and the micro1 interview link are workflow or account destinations rather than public job sources. They belong in the ApplyFlow and profile-import workstream, not the source-ingestion list.

## Priority source inventory

| Source | Owner/category | User URL or canonical endpoint | Coverage/use case | Access evidence | Ingestion decision | Priority |
|---|---|---|---|---|---|---:|
| Jobicy | Remote-job board/API provider | https://jobicy.com/api/v2/remote-jobs?count=100 | Worldwide remote jobs with geo, industry, type, date, salary, and canonical URL fields | Official API/RSS documentation; live JSON response returned HTTP 200 | Add a Jobicy JSON adapter; preserve attribution and canonical link; poll a few times daily and never more often than hourly | P0 |
| Remotive | Remote-job board/API provider | https://remotive.com/api/remote-jobs?limit=100 | Worldwide remote jobs with API/RSS access | Official API page; live JSON response returned HTTP 200 | Add a Remotive JSON adapter only with Remotive attribution, canonical links, 24-hour delay handling, and no lead-capture wall or third-party submission | P0 |
| Remote OK | Remote-job board/API provider | https://remoteok.com/api | Worldwide, regional, and country-filtered remote jobs, including Cameroon | Official API response returned HTTP 200 with job records, salary/category/location fields, and API terms in payload | Add a JSON adapter after schema and terms review; use follow links and visible Remote OK attribution | P0 |
| We Work Remotely | Remote-job board/RSS provider | https://weworkremotely.com/remote-jobs.rss | Large global remote board with country/region relevance | Official RSS endpoint returned HTTP 200 and RSS XML; official robots allows public paths outside account/admin areas | Keep existing RSS adapter; classify worldwide locations separately from Cameroon-specific results | P0 |
| Working Nomads | Remote-job board | https://www.workingnomads.com/jobs | Worldwide digital-nomad and remote roles | Public listings page; guessed `/jobs.rss` endpoint returned 404 | Keep as link-only until official RSS/API or permission is found | P1 |
| Remote.co | Remote-job board | https://remote.co/remote-jobs | Remote roles across industries | Public listing page returned HTTP 200; no feed/API confirmed | Terms/API review; do not scrape listing pages without an approved access path | P1 |
| NoDesk | Remote-job board | https://nodesk.co/remote-jobs/ | Remote roles and work-anywhere listings | User supplied public board; guessed RSS endpoint returned 404 and page response showed bot-protection signals | Link-only pending official feed/API or publisher permission | P1 |
| TrulyRemote | Remote-job board with Africa relevance | https://trulyremote.co/?locations=Africa | Africa-filtered remote jobs, valuable for Cameroon-to-world discovery | User supplied Africa filter; guessed feed returned 404; robots disallows `/api/*` | Link-only or partnership request until a documented feed/API is available | P1 |
| UNJobs | International organization vacancy directory | https://unjobs.org/ | UN and international-organization vacancies, potentially strong for African applicants | Public directory supplied by user; guessed RSS endpoint returned 404 | Research official feed/API and terms; prefer source-authorized links or employer/organization feeds | P1 |
| RareRoles | Curated job board | https://www.rareroles.com/ | Niche roles not always present on large boards | Public site supplied by user; no machine endpoint verified | Partnership or link-only; avoid scraping without permission | P1 |
| Still Hiring | Curated tech-job directory | https://stillhiring.today/ | Curated open-role discovery | Public site supplied by user; no machine endpoint verified | Link-only or request a feed | P1 |
| RemoteJobsFinder | Remote-job directory | https://remotejobsfinder.co/en | Worldwide remote-job discovery | Public page returned HTTP 200 but response showed bot-protection signals; onboarding is gated | No automation until official feed/API or permission | P1 |
| Built In | Regional tech-job network | https://builtin.com/jobs/remote | Technology roles and remote filters | Public remote page returned HTTP 200 but response showed bot-protection signals; user match URL is account-specific | Employer ATS adapters or official partnership only; no broad scraping | P1 |
| Wellfound | Startup-job network | https://wellfound.com/jobs | Startup roles, often remote or distributed | Public page returned HTTP 200 but response showed Turnstile/bot-protection signals; robots restricts internal job paths | Partnership or employer ATS links; no broad scraping | P1 |
| Flexa | Flexible-work directory | https://flexa.careers/jobs | Flexible and remote-work company/job discovery | Public page returned HTTP 200 but response showed bot-protection signals; no feed verified | Partnership/API review; link-only meanwhile | P1 |
| Rat Race Rebellion | Curated remote/work-from-home board | https://ratracerebellion.com/ | Remote and work-from-home roles | User supplied public site; no machine endpoint verified | Link-only pending feed/permission; add fraud-quality review | P1 |
| Prevetted Recruitment | Recruitment service | https://prevettedrecruitment.com/ | Recruitment and vetted opportunities | User supplied public site; not established as a public feed | Partnership only; do not ingest as a board without publisher permission | P2 |
| Global Work AI | Candidate workflow/service | https://globalwork.ai/en/journey/7/join/3 | Candidate journey, not clearly a public board | User supplied gated journey URL | ApplyFlow/link-only; not an ingestion source | P2 |
| Top Startups | Startup directory | https://topstartups.io/ | Employer discovery for targeted career-page expansion | Public directory supplied by user; not a job feed | Use only to seed approved employer ATS research; do not treat directory records as job postings | P2 |
| Sagan Recruitment | Recruiting/employer career page | https://saganrecruitment.com/career/ | Roles from one recruiting network | Employer/recruiter page supplied by user | Targeted adapter only after terms/endpoint review | P2 |
| Invisible Technologies | Employer careers | https://www.invisible.co/join-us/ | First-party employer roles | Public employer page supplied by user | Targeted employer adapter or canonical links; not an aggregator source | P2 |
| Nethermind | Employer careers | https://www.nethermind.io/ | First-party blockchain/software roles | Public employer page supplied by user | Targeted employer ATS discovery; no broad scraping | P2 |
| Doubledot Media | Employer careers | https://www.doubledotmedia.com/ | First-party employer roles | Public employer page supplied by user | Targeted employer adapter after endpoint review | P2 |
| Lower Street | Employer careers | https://lowerstreet.co/ | First-party employer roles | Public employer page supplied by user | Targeted employer adapter after endpoint review | P2 |
| CareerHound | Job directory | https://www.careerhound.io/jobs/all | General remote/job directory | User URL returned HTTP 404 during live probe; robots allows `/` but disallows onboarding | Revalidate canonical URL before any integration | P2 |
| AutoApply.Jobs | Application automation service | https://www.autoapply.jobs/home | Candidate application workflow, not a public source | Live probe failed to fetch; product appears workflow-oriented | ApplyFlow competitor/reference only; not a source | P2 |
| CareerWhiz | Application service | https://www.careerwhiz.ai/ | Resume, cover-letter, and recruiter service | User supplied service URL | ApplyFlow competitor/reference only; not a source | P2 |
| Simplify | Candidate profile and application workflow | https://simplify.jobs/preferences | User profile, preferences, tracker, and autofill workflow | User supplied account/preferences URL; no public profile API verified | Product integration: tracker CSV import, CV/profile import, and optional user-initiated handoff; never scrape private account data | P0 product |
| Alignerr | Candidate marketplace/account | https://app.alignerr.com/home | Candidate profile and work marketplace | User supplied sign-in/home URLs | Candidate workflow/reference only; not a public job feed | P2 |
| Smile & Hire | Candidate dashboard/service | https://www.smileandhire.com/va/dashboard | Candidate dashboard | User supplied authenticated dashboard URL | Do not access private dashboard; candidate workflow only | P2 |
| micro1 | Candidate assessment flow | https://www.interview.micro1.ai/start/micro1/ | Candidate interview/assessment link | User supplied candidate-specific URL | Do not ingest; candidate workflow only | P2 |
| itsatravelod / wantremotejobs label | Directory/listing link | https://www.itsatravelod.com/find-remote-jobs | Remote-job directory link from bookmark label | User supplied URL; brand/domain mismatch requires identity verification | Revalidate ownership and feed availability before consideration | P2 |
| Greenhouse employer boards | Employer ATS/API | https://developers.greenhouse.io/job-board.html | First-party employer roles worldwide | Existing JobMap adapter and official API pattern | Expand with approved employer board tokens and location/eligibility rules | P0 |
| Lever employer boards | Employer ATS/API | https://hire.lever.co/developer/documentation | First-party employer roles worldwide | Existing JobMap adapter and official API pattern; application creation is documented but requires approved employer/partner credentials | Expand with approved employer site names and location/eligibility rules; keep submission credentials server-side | P0 |
| Ashby employer boards | Employer ATS/API | https://developers.ashbyhq.com/docs/public-job-posting-api | First-party employer roles worldwide with explicit remote/workplace fields and apply URLs | Official public Job Postings API; public GET endpoint exposes jobs, locations, workplace type, compensation, and apply URL | Add approved job-board names for ingestion; verify employer-level application/embed permission before in-site submission | P0 |
| SmartRecruiters employer and partner boards | Employer ATS/API | https://developers.smartrecruiters.com/docs/the-smartrecruiters-platform | First-party employer roles worldwide | Official Job Board API plus Application API for screening questions/privacy policies and Post an Application; partner/employer authentication required | Pursue approved partner/employer credentials and scopes; keep keys server-side and validate job-specific questions before submission | P0 |

## Required fields for every approved source

Each source should record `owner`, `canonicalSourceUrl`, `machineEndpoint`, `accessMethod`, `termsState`, `coverage`, `refreshExpectation`, `fieldCompleteness`, `eligibilityEvidence`, `expiryPolicy`, `dedupeKey`, `attributionText`, and `failureContact`. A source is not considered production-ready merely because its web page is publicly visible.

## Global remote fields to normalize

Every remote posting should expose `remoteEligibility` with one of `cameroon-eligible`, `africa-eligible`, `worldwide`, `restricted`, or `unclear`. It should also preserve `eligibleCountries`, `excludedCountries`, `timezoneOverlap`, `employmentType`, `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryPeriod`, `languageRequirements`, `workAuthorization`, `postedAt`, `expiresAt`, `lastVerifiedAt`, and `sourceTrust`.

The eligibility label must be evidence-based. A posting that merely says “remote” should not be labeled worldwide. JobMap should show the source wording or a short explanation whenever it assigns a Cameroon-eligibility label.

## Acquisition order

The implementation order is to add Jobicy JSON, Remotive JSON, and Remote OK JSON adapters, extend the existing RSS adapter for WWR, and then add source-specific normalization tests. After the first feed refresh, we should compare duplicate rates, field completeness, source freshness, country/region signals, and the proportion of roles that can be confidently labeled Cameroon-eligible or worldwide. Sources without reliable eligibility evidence should remain visible but carry an `unclear` badge rather than being silently excluded.

## References

[1]: https://jobicy.com/jobs-rss-feed "Jobicy Remote Jobs API and RSS Feed"
[2]: https://remotive.com/remote-jobs/api "Remotive Remote Jobs Public API"
[3]: https://remoteok.com/api "Remote OK public API"
[4]: https://weworkremotely.com/remote-jobs.rss "We Work Remotely public all-jobs RSS feed"
[5]: https://weworkremotely.com/remote-job-rss-feed "We Work Remotely RSS information page"
[6]: https://remote.co/remote-jobs/ "Remote.co remote jobs"
[7]: https://www.workingnomads.com/jobs "Working Nomads remote jobs"
[8]: https://trulyremote.co/?locations=Africa "TrulyRemote Africa remote jobs"
[9]: https://unjobs.org/ "UNJobs international vacancies"
[10]: https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview "Greenhouse API overview"
[11]: https://hire.lever.co/developer/documentation "Lever developer documentation"
[12]: https://developers.ashbyhq.com/docs/public-job-posting-api "Ashby public job posting API"
[13]: https://developers.smartrecruiters.com/docs/the-smartrecruiters-platform "SmartRecruiters API platform"

## Current implementation progress

The global remote source network is **43% complete**. Jobicy, Remotive, Remote OK, and We Work Remotely are active through public JSON/RSS adapters and have returned live postings. The global eligibility engine is **15% complete**: JobMap stores and displays evidence-based worldwide, Africa-eligible, Cameroon-eligible, restricted, and unclear labels, but country restrictions, timezone overlap, work authorization, sponsorship, and language matching are not yet fully normalized.

ApplyFlow is **31% complete**. JobMap now has a local Application Pack editor and queue, a user-provided Simplify profile bridge, a private Supabase CV bucket, hosted Email/Google authentication wiring, and a source capability registry. Direct ATS submission, application event history, browser-assisted execution, and cross-device profile sync remain ahead.
