# Automated feed refresh and Google OAuth

**Updated:** 25 August 2026

## Six-hour feed refresh

JobMap now uses the GitHub Actions scheduled workflow at `.github/workflows/refresh-jobs.yml`. It runs at **17 minutes past every sixth hour** using the cron expression `17 */6 * * *`, and can also be started manually with `workflow_dispatch`.

Each run performs the following sequence:

| Step | Behavior |
|---|---|
| Validation | Runs the nationwide smoke tests before touching the feed. |
| Source ingestion | Fetches every enabled local and global source in `data/sources.json`, including FNE, ReliefWeb Cameroon RSS, Jobicy, Remotive, Remote OK, We Work Remotely, and the enabled Greenhouse employer board. |
| Public feed update | Normalizes records, deduplicates by title/company/location, removes records whose `expiresAt` has passed, and publishes `public/jobs.json` plus `public/ingestion-meta.json`. |
| Supabase synchronization | Upserts active normalized jobs into `public.jobs` by `(source_id, external_id)` and deletes database rows with `expires_at` earlier than the current UTC time. |
| Repository publication | Commits changed public feed files so the deployed Vite app receives the refreshed feed. |

The database synchronization runs server-side only. It requires the GitHub Actions secret `SUPABASE_SERVICE_ROLE_KEY`; this credential must never be placed in Vite environment variables or committed to the repository. The public Supabase project URL is declared directly in the workflow, so no URL secret is required.

The refresh is intentionally limited to sources marked `enabled` in the source configuration. Disabled candidates remain in the source catalog and datasheet but are not fetched. Expiration cleanup removes expired database rows; it does not silently delete a job merely because a source temporarily fails, which prevents a transient outage from erasing valid listings.

## Google OAuth status

The Google button is correctly wired in the JobMap client. The provider is now enabled and the production callback configuration is:

| Setting | Current state |
|---|---|
| Google provider enabled | **Yes** |
| Google client ID and secret | Configured in Supabase; never stored in the repository |
| Supabase redirect endpoint | `https://wukmngewrijgqqpmprci.supabase.co/auth/v1/callback` |
| Production site URL | `https://jobmap-ten.vercel.app` |
| Allowed production redirect | `https://jobmap-ten.vercel.app/**` |
| Allowed local redirects | `http://localhost:3000/**`, `http://localhost:5173/**` |

The earlier `Unsupported provider: provider is not enabled` error is resolved. The browser first visits Google for account selection and consent, then Google returns to Supabase, and Supabase redirects the authenticated session back to the JobMap origin. Email authentication remains available independently.

## References

[1]: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule "GitHub Actions scheduled workflows"
[2]: https://supabase.com/docs/guides/auth/social-login/auth-google "Supabase Google social login"
[3]: https://supabase.com/docs/guides/auth/overview "Supabase Auth overview"
