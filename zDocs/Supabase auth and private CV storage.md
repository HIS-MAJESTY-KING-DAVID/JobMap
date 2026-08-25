# Supabase authentication and private CV storage

**Updated:** 25 August 2026

## Project configuration

JobMap is connected to the Supabase project named `JobMap` in the `eu-west-1` region. The project reference is stored only in local deployment configuration. The public browser client uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only configuration uses:

- `SUPABASE_ACCESS_TOKEN` for Supabase Management API operations
- `SUPABASE_SERVICE_ROLE_KEY` for trusted server-side administration only
- `SUPABASE_DB_HOST`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, and `SUPABASE_DB_PORT` as database metadata
- `DATABASE_URL` remains unset until the database password is provided through the secure Supabase dashboard flow; JobMap must never guess or construct a credential-bearing connection string.

`.env` files are ignored and must never be committed. `VITE_*` variables are available to the browser, so no service-role or database credential may use a `VITE_` prefix.

## Authentication

The static JobMap client now exposes Email sign-in/sign-up and Google OAuth entry points through the Supabase Auth client. Anonymous job discovery remains available. An authenticated session is required for profile synchronization and private CV uploads.

Email authentication still requires production verification and recovery-email settings. Google authentication requires the Google provider client ID/secret and redirect configuration to be entered in Supabase Auth settings. Those provider credentials are not present in the repository or chat transcript.

## Profile persistence

The `public.profiles` table stores only user-owned profile fields: name, email, phone, target role, skills, languages, timezone, work authorization, salary preference, city, country, LinkedIn, portfolio, education, experience, and certifications. Row-level security restricts select, insert, and update operations to `auth.uid() = id`.

The UI remains local-first. When a session exists, it loads the matching remote row and saves a snake_case database row after saving the local profile. When Supabase is unavailable, the local profile remains usable.

## CV storage

The private `cv-documents` Storage bucket stores user CV objects. The target object path is `{auth-user-id}/{random-id}-{safe-file-name}`. Storage row-level security allows a user to access only objects whose first path segment equals their authenticated user ID.

The `public.cv_documents` table stores user-owned metadata: storage path, original filename, content type, file size, creation time, and a nullable deletion timestamp. CV bytes remain in private object storage; the database stores metadata and controlled references.

User-provided CV files were uploaded to the private bucket as a secure staging import during this milestone. They are not public and are not committed to Git. Once the user creates or signs into the JobMap account, the next migration slice will associate staged files with the authenticated user and expose version selection in Application Packs.

## Retention and deletion

Users may request deletion. The product policy is to remove user-visible profile, application, and document records immediately, retain an access-restricted deletion tombstone and eligible backups for 90 days, and then purge retained copies. Service-role operations must run only in a trusted backend or administrative job; the browser must never receive the service-role key.

## Current implementation progress

| Capability | Progress | State |
|---|---:|---|
| Email auth | 25% | Client entry point and Supabase session wiring are present; verification, recovery, consent, and production email settings remain. |
| Google auth | 20% | OAuth client entry point is present; Google provider credentials, redirect allowlist, and account-linking QA remain. |
| Profile sync | 28% | Authenticated `profiles` read/upsert path is present with local fallback and camelCase/snake_case mapping. |
| Private CV storage | 42% | Private bucket, user-folder policy, upload path, and metadata schema are present; staged files need account association, deletion, signed downloads, and version selection. |
| ApplyFlow | 31% | The profile/storage foundation is now connected to the controlled application architecture; ATS execution, browser assistance, and audit events remain. |
