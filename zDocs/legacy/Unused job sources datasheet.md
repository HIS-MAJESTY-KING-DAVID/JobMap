# Unused and non-ingestion website datasheet

**Updated:** 25 August 2026

These sources are preserved for future partnership, link-only discovery, employer ATS research, or ApplyFlow reference. They are **not enabled as automated JobMap ingestion sources** because a documented feed/API, permission, stable canonical endpoint, or public-job use case was not verified. Their records are nevertheless present in the Supabase `job_sources` table with `enabled = false` and an explicit `status`.

| Source | Coverage/type | URL | Database status | Why not enabled | Future path |
|---|---|---|---|---|---|
| Working Nomads | Global remote board | https://www.workingnomads.com/jobs | `candidate-no-feed-verified` | Public listings page; guessed RSS endpoint returned 404 | Request or verify official feed/API |
| Remote.co | Global remote board | https://remote.co/remote-jobs | `candidate-no-feed-verified` | Public page, but no feed/API confirmed | Terms/API review or partnership |
| NoDesk | Global remote board | https://nodesk.co/remote-jobs/ | `candidate-bot-protection` | Bot-protection signals and no approved feed | Link-only or publisher permission |
| TrulyRemote | Global board with Africa filter | https://trulyremote.co/?locations=Africa | `candidate-no-feed-verified` | No approved feed/API verified | Partnership or link-only discovery |
| UNJobs | Global international-organization directory | https://unjobs.org/ | `candidate-no-feed-verified` | RSS guess failed; official organization feeds preferred | Research authorized feed and organization sources |
| RareRoles | Global curated board | https://www.rareroles.com/ | `candidate-no-feed-verified` | No machine endpoint verified | Partnership or link-only |
| Still Hiring | Global curated directory | https://stillhiring.today/ | `candidate-no-feed-verified` | No machine endpoint verified | Request a feed |
| RemoteJobsFinder | Global remote directory | https://remotejobsfinder.co/en | `candidate-bot-protection` | Bot-protection signals and gated onboarding | Wait for official API/permission |
| Built In | Global/regional tech network | https://builtin.com/jobs/remote | `candidate-bot-protection` | Broad scraping not approved | Employer ATS adapters or partnership |
| Wellfound | Global startup network | https://wellfound.com/jobs | `candidate-bot-protection` | Turnstile/bot protection and restricted internal paths | Partnership or employer ATS links |
| Flexa | Global flexible-work directory | https://flexa.careers/jobs | `candidate-bot-protection` | No feed verified | Partnership/API review |
| Rat Race Rebellion | Global work-from-home board | https://ratracerebellion.com/ | `candidate-no-feed-verified` | No machine endpoint verified; needs scam-quality review | Link-only pending permission/feed |
| Prevetted Recruitment | Global recruitment service | https://prevettedrecruitment.com/ | `partnership-only` | Not established as a public job feed | Partnership only |
| Sagan Recruitment | Global recruiting/employer page | https://saganrecruitment.com/career/ | `targeted-adapter-candidate` | No approved endpoint verified | Targeted ATS adapter after review |
| Invisible Technologies | Global employer careers | https://www.invisible.co/join-us/ | `targeted-adapter-candidate` | Employer source, not broad aggregator | Targeted employer adapter |
| Nethermind | Global employer careers | https://www.nethermind.io/ | `targeted-adapter-candidate` | Employer source, endpoint not yet verified | Targeted ATS discovery |
| Doubledot Media | Global employer careers | https://www.doubledotmedia.com/ | `targeted-adapter-candidate` | Endpoint not yet verified | Targeted employer adapter |
| Lower Street | Global employer careers | https://lowerstreet.co/ | `targeted-adapter-candidate` | Endpoint not yet verified | Targeted employer adapter |
| CareerHound | Global directory | https://www.careerhound.io/jobs/all | `revalidate-url` | Supplied jobs URL returned 404 during verification | Revalidate canonical URL |
| itsatravelod / wantremotejobs | Global directory link | https://www.itsatravelod.com/find-remote-jobs | `revalidate-identity` | Brand/domain identity mismatch requires verification | Confirm ownership and feed |
| Top Startups | Global employer directory | https://topstartups.io/ | `directory-only` | Directory is not itself a vacancy feed | Use to seed approved employer ATS research |
| Global Work AI | Workflow service | https://globalwork.ai/en/journey/7/join/3 | `workflow-only` | Candidate journey, not a public listing feed | ApplyFlow/reference only |
| AutoApply.Jobs | Workflow/competitor service | https://www.autoapply.jobs/home | `workflow-only` | Application workflow, not a public source | Competitor/reference research |
| CareerWhiz | Application service | https://www.careerwhiz.ai/ | `workflow-only` | Service rather than public vacancy feed | ApplyFlow/reference research |
| Simplify | Profile/tracker workflow | https://simplify.jobs/preferences | `user-provided-import-only` | Private account; no credentials or private storage access | User-provided tracker/profile imports only |
| Alignerr | Candidate marketplace | https://app.alignerr.com/home | `workflow-only` | Authenticated candidate account | Do not access private dashboard |
| Smile & Hire | Candidate dashboard | https://www.smileandhire.com/va/dashboard | `workflow-only` | Authenticated dashboard | Do not access private dashboard |
| micro1 | Candidate assessment | https://www.interview.micro1.ai/start/micro1/ | `workflow-only` | Candidate-specific assessment link | Do not ingest |

## Enabled sources for comparison

The current enabled source family is intentionally smaller and evidence-based: FNE and ReliefWeb Cameroon RSS for local coverage, plus We Work Remotely RSS, Jobicy API, Remotive API, Remote OK API, and the Stripe Greenhouse employer board for global coverage. Greenhouse, Lever, Ashby, SmartRecruiters, and ReliefWeb API records are present as disabled candidates where credentials, employer approval, or app-name configuration remains necessary.

## References

[1]: https://jobmap.com/ "JobMap project"
[2]: https://help.simplify.jobs/articles/2140179-using-the-job-tracker "Simplify Help: Using the Job Tracker"
[3]: https://developers.greenhouse.io/job-board.html "Greenhouse Job Board API"
[4]: https://developers.ashbyhq.com/docs/public-job-posting-api "Ashby Public Job Posting API"
