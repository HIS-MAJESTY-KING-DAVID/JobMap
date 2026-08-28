# JobMap database schema and Row-Level Security

**Updated:** 25 August 2026

## Purpose

JobMap uses Supabase Auth for identity and PostgreSQL for application data. The Prisma schema at `prisma/schema.prisma` is the canonical application model, while `supabase/migrations/202608250001_jobmap_user_lifecycle.sql` is the executable Supabase migration. Because Supabase owns `auth.users`, application tables store `user_id` foreign keys to that managed identity table; Prisma documents the relationship but does not attempt to create or manage `auth.users`.

The model supports the current local-first PWA and the planned Cameroon-to-the-world product: public discovery, optional authenticated persistence, private CV versioning, eligibility-aware applications, controlled answer memory, application audit history, consent, notifications, and deletion scheduling.

## Table inventory

| Table | Ownership | Purpose | Client access |
|---|---|---|---|
| `profiles` | One row per authenticated user | Professional identity, contact fields, GPA, education, experience, authorization, location, preferences, onboarding, and deletion marker | Own row only |
| `profile_versions` | User-owned | Immutable-ish snapshots for reusable Application Packs and future version selection | Own rows only |
| `cv_documents` | User-owned | Private CV metadata linked to private Storage objects, with versions, default selection, checksum, and deletion marker | Own rows only; bytes remain private in Storage |
| `job_sources` | Shared catalog | Source attribution, source type, application mode, verification, and enablement | Public read of enabled sources; trusted ingestion writes only |
| `jobs` | Shared catalog | Canonical normalized jobs, eligibility signals, source URLs, approved application endpoints, and raw-source traceability | Public read; trusted ingestion writes only |
| `saved_jobs` | User-owned join | Saved jobs and private notes | Own rows only |
| `saved_searches` | User-owned | Search criteria, alert preference, and last-delivery marker | Own rows only |
| `applications` | User-owned | Application Pack, selected profile/CV versions, duplicate fingerprint, eligibility snapshot, status, and submission timestamps | Own rows only; soft-deleted records hidden |
| `application_answers` | User-owned sensitive memory | User-confirmed answers for authorization, sponsorship, salary, demographics, legal attestations, and unknown questions | Own active rows only; no public access |
| `application_events` | User-owned audit trail | Prepare, review, edit, submit, pause, fallback, error, and revoke events | Own rows may be read/created; server can append trusted events |
| `consent_records` | User-owned audit trail | Policy-versioned consent and revocation history | Own rows may be read/created; no client mutation of history |
| `notification_preferences` | One row per user | Email, application-update, saved-search, and marketing controls | Own row only |
| `user_deletion_requests` | User-owned request plus trusted worker | Immediate product deletion request, 90-day scheduled purge, status, and completion metadata | Own request only; purge worker uses service role |

## RLS contract

RLS is enabled on all thirteen public tables. User-owned policies consistently require `auth.uid() = user_id`, or `auth.uid() = id` for `profiles`. Public clients can read enabled source metadata and normalized jobs, but cannot insert, update, or delete shared catalog data. The service role is intentionally not granted to the browser and is reserved for ingestion, retention, cleanup, and administrative jobs.

The private `cv-documents` Storage bucket is also enforced by path. A signed-in user may access an object only when the first path segment equals their Auth user ID. The expected path is `{auth-user-id}/{random-id}-{safe-file-name}`. Storage and `cv_documents` metadata policies are separate defenses.

> RLS is an authorization boundary, not a substitute for validation. Application code must still reject duplicate fingerprints, unsupported application modes, missing eligibility evidence, unsafe file types, and unconfirmed sensitive answers.

## Authentication lifecycle

A Supabase Auth user creation trigger inserts a minimal profile row and default notification preferences. The user may then complete their profile, import a user-provided Simplify export, upload private CVs, create profile versions, save jobs, and assemble Application Packs. Sign-out does not delete data. A deletion request is user-visible immediately, while the restricted deletion queue schedules final purge after 90 days in accordance with the product policy.

The schema does not store passwords, Google tokens, CAPTCHA answers, or third-party portal credentials. Supabase Auth owns authentication providers. JobMap stores only application data necessary for the user-controlled workflow, and sensitive answer memory remains revocable and never authorizes silent final submission.

## Prisma and migration workflow

The executable Supabase migration is idempotent for the tables, columns, indexes, triggers, policies, bucket, and Auth trigger it owns. The Prisma schema is intended for future server-side database access once a credential-bearing `DATABASE_URL` is provisioned securely. It must not be used from the Vite browser bundle. Any future Prisma migration must be reviewed against the Supabase migration and managed Auth schema before deployment.

## Current status

| Capability | Progress | Status |
|---|---:|---|
| Authenticated user lifecycle schema | 65% | Auth boundary, profile bootstrap, deletion queue, notification preferences, consent, and RLS are deployed. Trusted purge worker and recovery UX remain. |
| Profile and CV persistence | 52% | Profile sync, GPA/preferences columns, private CV metadata, Storage path policy, and version-ready tables are deployed. UI version selection and signed downloads remain. |
| ApplyFlow persistence | 43% | Applications, duplicate fingerprint, Application Pack fields, answer memory, and event tables are deployed. UI synchronization and direct adapters remain. |
| Privacy and authorization | 58% | Public/shared versus user-owned boundaries, Storage policies, and 90-day deletion schedule are deployed. Formal security review and retention worker remain. |

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase: Row Level Security"
[2]: https://supabase.com/docs/guides/auth/managing-user-data "Supabase: Managing User Data"
[3]: https://www.prisma.io/docs/orm/prisma-schema "Prisma schema reference"
