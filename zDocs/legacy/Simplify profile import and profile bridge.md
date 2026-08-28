# Simplify profile import and profile bridge

**Last updated:** 25 August 2026  
**Status:** Local import plus hosted auth/CV foundation shipped

## Product decision

JobMap imports only data that the user deliberately provides. The user can upload a CSV, JSON, TXT, or Markdown export, or paste copied profile lines. JobMap previews recognized mappings and requires field-level confirmation before merging them into the local profile. JobMap does not request Simplify credentials, scrape the Simplify dashboard, or read private browser-extension storage.

This boundary matches the available public Simplify workflow. Simplify’s Resume Builder documentation describes profile-backed resume sections such as education, certificates, professional experience, projects, skills, languages, and interests, and says completed resumes can be exported [1]. Simplify’s Copilot documentation describes common application fields including contact information, education, work experience, work authorization, demographic questions, links, skills, and resume bullet points [2].

## Current implementation

The Profile workspace now contains a **Simplify bridge** with a file input and a paste area. The parser recognizes common aliases for name, contact details, target role, skills, languages, timezone, work authorization, salary preference, location, links, education, experience, and certifications. JSON can be nested under `profile` or `data`; CSV can use a header row; copied text can use labelled lines such as `Skills: React, Excel`.

The preview reports the detected format, recognized fields, and unmapped keys. Users can deselect individual fields, discard the preview, or confirm selected fields. Confirmed values are merged into the local `jobmap-profile` record and immediately become available to ApplyFlow’s local draft preparation. The importer intentionally does not parse private account sessions or silently overwrite data.

## Progress

| Area | Previous | Current | Remaining |
|---|---:|---:|---|
| Simplify profile/resume import | 18% | **22%** | Resume PDF/DOCX extraction, richer section mapping, duplicate handling, profile versioning, and authenticated storage |
| ApplyFlow profile foundation | 26% | **31%** | Profile-backed tailoring, CV versions, direct APIs, browser-assisted execution, and audit records |
| Overall JobMap product | 46% | **51%** | Provider configuration, profile versions, eligibility ranking, swipe queue, application execution, audit history, and cross-device sync |

These percentages reflect functional scope, not the volume of code. The importer remains user-initiated, while Supabase Email/Google client wiring, the user-owned profile table, and a private CV bucket now provide the first hosted persistence foundation. Production provider configuration, account recovery, CV versioning, and cross-device ApplyFlow sync remain ahead.

## Next slice

The next recommended work is to finish the authenticated profile lane: configure Email verification and Google OAuth, claim the staged user-provided CVs to the account, add CV version selection and signed downloads, and then add Simplify Tracker CSV import. Direct ATS submission and browser-assisted execution should remain blocked until profile provenance, consent, duplicate prevention, and audit events are complete.

## References

[1]: https://help.simplify.jobs/articles/1996171-resume-builder-basics "Simplify — Resume Builder Basics"
[2]: https://help.simplify.jobs/articles/2415391-using-copilot-to-autofill-applications "Simplify — Using Copilot to Autofill Applications"
