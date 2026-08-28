# JobMap Database Schema, Auth & Private Storage Reference

**Last updated:** 28 August 2026  
**Status:** Deployed email/Google auth wiring, profile synchronization, private CV storage, and RLS schema.

---

## 1. Project Configuration & Environment Variables

JobMap integrates with a Supabase project located in the `eu-west-1` region.
The client environment uses standard Vite-prefixed variables exposed to the browser:
- `VITE_SUPABASE_URL`: The project endpoint URL.
- `VITE_SUPABASE_ANON_KEY`: Public anonymous API key.

Server-side and automated deployment workflows use secure keys that are never exposed to the client bundle:
- `SUPABASE_SERVICE_ROLE_KEY`: Service-role administrative key. Reserved for automated ingestion, cron-based cleanup, and retention purge tasks.
- `SUPABASE_ACCESS_TOKEN`: Management API key.
- `DATABASE_URL`: Connection string. Note that direct Postgres connection parameters are only configured on the server-side, and no database credentials should ever be pre-populated or guessed by client scripts.

---

## 2. Authentication & User Lifecycle

JobMap supports a hybrid access model:
- **Anonymous Access:** Job searching, map views, local filtering, and queue preview require no session.
- **Authenticated Access:** Email/password sign-in and Google OAuth allow profile synchronization, private document storage, structured ApplyFlow generation, saved searches, and application history.

Email authentication requires verification and password recovery flows. Google OAuth is configured via redirection paths pointing to the production site and local developer instances.

---

## 3. Database Schema & RLS Policies

Prisma represents the canonical data model (`prisma/schema.prisma`), while the database runs migration scripts (`supabase/migrations/...`) to synchronize the PostgreSQL tables, indexes, triggers, and row-level security.

### Table Inventory

| Table | Ownership | Purpose | Client Access |
|---|---|---|---|
| `profiles` | User-owned | Seeking preferences, contact details, GPA, skills, timezone, work authorization, location, onboarding status, and deletion marker | Own row only (`auth.uid() = id`) |
| `profile_versions` | User-owned | Snapshots for historical Application Packs and version selection | Own rows only |
| `cv_documents` | User-owned | Metadata linked to Storage objects, default CV indicators, checksum, and deletion markers | Own rows only |
| `job_sources` | Shared catalog | Source metadata, slugs, coverage, status, and application capability | Public read of enabled sources; trusted writes only |
| `jobs` | Shared catalog | Normalized jobs, eligibility badges, coordinates fallbacks, and source URLs | Public read; trusted writes only |
| `saved_jobs` | User-owned | Join table for saved openings and notes | Own rows only |
| `saved_searches` | User-owned | Stored filters, labels, and notification toggle | Own rows only |
| `applications` | User-owned | Application Pack, selected CV version, duplicate fingerprints, status, and submission receipts | Own rows only |
| `application_answers` | User-owned | Confirmed answers to screening, salary, and authorization questions | Own rows only; no public access |
| `application_events` | User-owned | Audit log of actions (prepare, review, submit, error) | Own rows only |
| `consent_records` | User-owned | Records of user privacy policy versions accepted or revoked | Own rows only |
| `notification_preferences` | User-owned | Email/app-update switches | Own row only |
| `user_deletion_requests` | User-owned | deletion requests, scheduled purge dates, and completion status | Own request only |

### Row-Level Security (RLS)
RLS is active on all tables. Policies consistently enforce `auth.uid() = user_id`.
Anonymous users can read enabled `job_sources` and active `jobs`, but write access to the catalog is restricted. The database service role bypassed RLS and is strictly reserved for backend cron jobs and administrative workers.

---

## 4. Private Storage & CVs

Private documents are stored in the `cv-documents` Supabase Storage bucket.
- **Path structure:** `{auth-user-id}/{random-id}-{safe-file-name}`.
- **Authorization:** Enforced by Storage policies. A signed-in user may only read/write files under a folder named with their own `auth.uid()`.
- **CV metadata:** The `cv_documents` table records paths, names, types, sizes, and default designations. Binary data remains securely inside the Storage bucket and is accessed only via temporary signed URLs.

---

## 5. Data Retention & Account Deletion

When a user requests account deletion, the system handles it in two phases:
1. **Immediate logical deletion:** The user's profile and active files are immediately hidden.
2. **Restricted Deletion Queue (90 days):** The deletion request is written to `user_deletion_requests`. A backend worker runs daily, filtering records where `scheduled_purge_at <= now()`.
3. **Physical Purge:** After 90 days, the user's records across all tables (profiles, CVs, searches, applications, answers) are permanently deleted, and files are removed from the Storage bucket.

---

## 6. Implementation Progress

| Capability | Progress | Status |
|---|---:|---|
| Authenticated User Lifecycle | 65% | Bootstrap schema, consent, notification preferences, and basic RLS are active. Deletion logic is wired; advanced recovery UX is pending. |
| Profile & CV Sync | 52% | Profiles sync with camelCase mapping, private Storage folder RLS is active, and CV metadata tables are in place. UI CV selection is deployed. |
| ApplyFlow Persistence | 43% | Tables for applications, duplicate protection, answer memory, and audit trails are deployed. Cloud sync of applications is active. |
| Privacy & Security | 58% | Storage folder restrictions and 90-day logical-to-physical deletion triggers are in place. |
| Email / Google Auth | 25% | Session handling and client entry points are wired; production provider linking and recovery flows remain to be finalized. |
