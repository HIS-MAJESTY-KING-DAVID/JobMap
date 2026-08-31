# Global Remote & Unused Job Sources Datasheet

**Last updated:** 31 August 2026  
**Status:** Ingestion enabled for 5 priority global feeds (Jobicy, Remotive, Remote OK, We Work Remotely, Preply Ashby); 132 deduplicated candidates registered across 16 categories.

---

## 1. Decision Summary & Active Global Feeds

The initial wave prioritizes global feeds that expose structured fields and preserve canonical links, attribution, freshness, and geo-eligibility.

| Source | Category | Target API or Endpoint | Ingestion Rule | Priority |
|---|---|---|---|---:|
| **Preply Careers (Ashby ATS)** | Employer ATS | `https://api.ashbyhq.com/posting-api/job-board/preply?includeCompensation=true` | Ashby API adapter. Normalizes 104+ corporate, engineering, and remote roles. | P0 (Active) |
| **Jobicy** | Job Board | `https://jobicy.com/api/v2/remote-jobs?count=100` | Exposes geo, type, and salary. Requires visible attribution. Limit polling to a few times daily (max hourly). | P0 (Active) |
| **Remotive** | Job Board | `https://remotive.com/api/remote-jobs?limit=100` | Exposes remote tags. Requires direct attribution and no third-party middle-man submissions. | P0 (Active) |
| **Remote OK** | Job Board | `https://remoteok.com/api` | Exposes category, salary, and location. Requires source mention and follow links. | P0 (Active) |
| **We Work Remotely** | Job Board | `https://weworkremotely.com/remote-jobs.rss` | RSS XML feed is parsed directly. Classify locations to isolate Cameroon-eligible roles. | P0 (Active) |

---

## 2. Scouted & Deduplicated Candidate Sources (132 Total)

All platforms provided in user prompt lists and reference screenshots have been scouted and deduplicated. They are categorized by business model and technical compatibility:

### Teaching & Tutoring Platforms (Gig / Freelance Marketplaces)
*Preserved in datasheet and registered in `source-candidates.json` as `candidate-tutoring-marketplace`.*
- **Preply Marketplace** (`https://preply.com/`): Online 1-on-1 language tutoring platform (tutor signups). Corporate roles ingested via Ashby ATS above.
- **italki** (`https://www.italki.com/`): Independent language teacher registration portal.
- **Verbling** (`https://www.verbling.com/`): Online language tutoring marketplace (Chegg/Busuu).
- **Lingoda** (`https://www.lingoda.com/`): Online language school portal (`/api/jobs` requires auth, 401).
- **AmazingTalker** (`https://www.amazingtalker.com/`): 1-on-1 online tutoring marketplace (Cloudflare bot protection).
- **VIPKid** (`https://vipkid.com/`): Online English tutoring gig marketplace.
- **Teachable** (`https://teachable.com/`): Course creation and online teaching platform.
- **Outschool** (`https://outschool.com/`): K-12 live online class teaching platform.
- **Chegg Tutors** (`https://chegg.com/`): Online tutoring gig service.

### Freelancing Platforms & Microtask Marketplaces
*Preserved as `candidate-freelance-gig-platform`.*
- **Upwork** (`https://upwork.com/`), **Fiverr** (`https://fiverr.com/`), **Freelancer** (`https://freelancer.com/`), **Toptal** (`https://toptal.com/`), **PeoplePerHour** (`https://peopleperhour.com/`): Freelance talent project bidding marketplaces.
- **99designs**, **DesignCrowd**, **Dribbble**, **Behance**: Creative design project & portfolio marketplaces.
- **MTurk**, **Microworkers**, **RemoteTasks**, **Appen**, **Clickworker**: Data entry, AI annotation, and microtask crowdsourcing platforms.
- **Rev**, **TranscribeMe**, **Gengo**, **One Hour Translation**, **CrowdSurf Work**: Audio transcription, translation, and captioning gig portals.
- **Survey Junkie**, **Swagbucks**, **UserTesting**, **InboxDollars**, **Respondent**: User research, survey, and usability testing gig platforms.

### Remote Job Boards (Pending / Unused Feeds)
*Preserved as `candidate-no-feed-verified` or `candidate-bot-protection`.*
- **Career Hound** (`https://careerhound.io/`), **RemoteHub** (`https://remotehub.com/`), **Virtual Vocations** (`https://virtualvocations.com/`), **SkipTheDrive** (`https://skipthedrive.com/`), **PowerToFly** (`https://powertofly.com/`), **Authentic Jobs** (`https://authenticjobs.com/`), **EuropeRemotely** (`https://europeremotely.com/`), **Jobspresso** (`https://jobspresso.co/`), **Dynamite Jobs** (`https://dynamitejobs.com/`), **Pangian** (`https://pangian.com/`), **Working Nomads**, **Remote.co**, **TrulyRemote**, **UNJobs**, **ProBlogger Jobs**, **Contena**, **FlexJobs**, **SimplyHired**.

### Gated & Bot-Protected Platforms
*Preserved as `candidate-bot-protection`.*
- **Wellfound / AngelList** (`https://wellfound.com/jobs`): Turnstile protection active.
- **Built In** (`https://builtin.com/jobs/remote`): Account login gated.
- **Flexa** (`https://flexa.careers/jobs`): Bot protection active.
- **NoDesk** (`https://nodesk.co/remote-jobs/`): Bot protection active.
- **RemoteJobsFinder** (`https://remotejobsfinder.co/`): Bot protection active.

### Defunct or Deprecated Job APIs
*Preserved as `candidate-deprecated-or-defunct`.*
- **GitHub Jobs** (`https://jobs.github.com/`): Retired by GitHub / Microsoft.
- **Stack Overflow Jobs** (`https://stackoverflow.com/jobs`): Retired by Stack Overflow.

### Non-Job Software Tools & Services
*Preserved as `candidate-non-job-service`.*
- **Social Media Management**: Hootsuite, Buffer, SocialBee, Sprout Social, AgoraPulse.
- **E-commerce & Selling**: Etsy, eBay, Amazon Services, Redbubble, Zazzle.
- **Stock Photography & Video**: Shutterstock, Adobe Stock, iStockPhoto, Alamy, Pond5.
- **Virtual Event Hosting**: Hopin, Eventbrite, Run the World, Bizzabo, Airmeet.
- **Tools**: RezPass (resume scoring tool).

---

## 3. Dedicated Employer Candidates & ATS Formats

- **Preply Careers**: Active via Ashby ATS (`ashby-preply`).
- **Greenhouse Public Boards**: Active (e.g. Stripe).
- **Lever Public Boards**: Active template.
- **Ashby Public Board API**: Fully supported adapter in `scripts/ingest.js`.
- **SmartRecruiters API**: Supported candidate format.

---

## 4. Normalization Fields

Every remote posting normalized by the ingestion script populates standard location, remote eligibility (`cameroon-eligible`, `africa-eligible`, `worldwide`, `restricted`, `unclear`), salary, employment type, and canonical apply URLs.
