# Production audit notes

## 28 August 2026

The live Vercel deployment at https://jobmap-ten.vercel.app/ returned the expected document title, but the rendered viewport showed only an empty `#root` element and no visible JobMap shell. This is a production-blocking finding. The deployment needs runtime-console and network diagnostics before release promotion.

The local production preview initially entered the new recovery boundary with `Cannot read properties of null (reading 'applicationMode')`. Root cause: `JobDetailPanel` called recommendation helpers before its nullable-job guard. The guard was moved ahead of those calculations while preserving hook ordering. After rebuilding, the local production preview renders the JobMap shell, map, navigation, feed, and mobile bottom navigation successfully.

The live Vercel URL was serving an older cached deployment artifact during this audit; Vercel CLI promotion is unavailable in the sandbox because no Vercel credentials are configured. The validated commit must therefore be promoted through the connected Vercel/Git integration or an authenticated Vercel CLI session.

The optimized local preview was smoke-tested in the browser. The Cameroon Local shell rendered with the map and feed. Switching to Global Remote rendered the user-controlled Swipe queue with Pass, Save, and ApplyFlow actions, source health, and bottom navigation. Switching to Saved rendered an empty-state Saved view without trapping the user. Lighthouse scores on the local production build were Performance 76, Accessibility 92, Best Practices 93, and SEO 92. The current published source-health metadata reports 6/7 healthy because ReliefWeb RSS returned HTTP 406; this is visible to users rather than hidden.

## Final hardening pass

The final audit added a Vercel SPA/security configuration, a recoverable React error boundary, lazy loading for the Leaflet map, explicit privacy and ApplyFlow consent recording, cloud application-event hydration, a trusted 90-day retention purge worker with dry-run support and user-folder path checks, a daily GitHub Actions purge workflow, bounded ingestion retries/timeouts/FNE pagination, and a deterministic `npm run test:production` release gate.

The browser-assisted handoff was narrowed from broad HTTPS injection to approved employer routes: `boards.greenhouse.io`, `job-boards.greenhouse.io`, and Stripe’s `/jobs/` route. A per-domain adapter registry now supplies exact field mappings before conservative label fallback. Incoming handoffs require the approved JobMap origin, matching bundle origin, job identifier, version, expiry, and array-shaped fields. The extension still never submits forms and remains explicitly user-triggered.

Final automated evidence: production checklist passed; ESLint passed; Vite production build passed; discovery, autofill, and recommendation smoke tests passed; Node syntax checks passed for ingestion, retention, extension, and service-worker scripts; `npm audit --omit=dev --audit-level=moderate` reported zero vulnerabilities; and `git diff --check` passed. The local production browser smoke rendered the JobMap shell, Cameroon map/feed, remote flow, Saved view, and mobile navigation. Lighthouse on the local production build measured Performance 76, Accessibility 92, Best Practices 93, and SEO 92.

The remaining external release controls are configuration/operations rather than hidden code claims: verify Supabase email and Google providers plus redirect URLs, configure the GitHub secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the retention workflow, confirm the six-hour ingestion workflow and deployed feed timestamps, perform a fresh-account mobile test, and promote the validated commit through the connected Vercel integration. Universal auto-submit, arbitrary employer scraping, CAPTCHA handling, credentials, legal attestations, and silent sensitive-answer submission remain intentionally unsupported.
