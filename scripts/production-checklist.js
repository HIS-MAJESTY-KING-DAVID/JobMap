import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = json('package.json');
const manifest = json('public/manifest.webmanifest');
const sources = json('data/sources.json').sources;
const jobs = json('public/jobs.json');
const ingestionMeta = json('public/ingestion-meta.json');
const extensionManifest = json('extension/manifest.json');
const vercel = json('vercel.json');

check(Boolean(packageJson.scripts?.build && packageJson.scripts?.lint), 'package scripts must include build and lint');
check(Boolean(manifest.name && manifest.start_url && manifest.display && manifest.icons?.length), 'PWA manifest is incomplete');
check(fs.existsSync(path.join(root, 'public/sw.js')), 'service worker is missing');
check(fs.existsSync(path.join(root, 'public/icon.svg')), 'PWA icon is missing');
check(Array.isArray(sources) && sources.filter((source) => source.enabled).length >= 5, 'fewer than five enabled feed sources are configured');
for (const source of sources.filter((item) => item.enabled)) check(Boolean(source.url || source.boardToken || source.site), `enabled source ${source.id} has no endpoint configuration`);
check(Array.isArray(jobs) && jobs.length > 0, 'published job feed is empty');
for (const job of jobs.slice(0, 100)) {
  check(Boolean(job.title && job.company && job.source && job.sourceUrl), `job ${job.id || 'unknown'} lacks required provenance fields`);
  check(Boolean(job.lastVerifiedAt && job.expiresAt), `job ${job.id || 'unknown'} lacks freshness fields`);
}
check(Boolean(ingestionMeta.generatedAt && ingestionMeta.sources), 'ingestion metadata is incomplete');
check(fs.existsSync(path.join(root, 'scripts/purge-deleted-users.js')), '90-day retention worker is missing');
check(fs.existsSync(path.join(root, '.github/workflows/purge-deleted-users.yml')), '90-day retention workflow is missing');
check(fs.existsSync(path.join(root, '.github/workflows/quality-gate.yml')), 'CI quality-gate workflow is missing');
check(fs.existsSync(path.join(root, '.github/workflows/zap-baseline.yml')), 'OWASP ZAP baseline workflow is missing');
check(fs.existsSync(path.join(root, 'playwright.config.cjs')), 'Playwright production audit configuration is missing');
check(fs.existsSync(path.join(root, 'tests/e2e/production.spec.cjs')), 'Playwright production audit suite is missing');
check(read('src/main.jsx').includes('ErrorBoundary'), 'React error boundary is not mounted');
check(read('src/components/ApplyFlowPanel.jsx').includes('getApplicationReadiness'), 'ApplyFlow readiness gate is not wired');
check(read('src/services/fieldAutofill.js').includes('blocked'), 'autofill blocked-field policy is not present');
check(read('src/services/supabase.js').includes('recordConsent'), 'consent persistence helper is missing');
check(JSON.stringify(extensionManifest).includes('approved'), 'extension origin allowlist is not documented');
check(!extensionManifest.host_permissions?.includes('<all_urls>'), 'extension must not request all host permissions');
check(!extensionManifest.content_scripts?.some((script) => script.matches?.includes('https://*/*')), 'extension must not inject into every HTTPS site');
check(fs.existsSync(path.join(root, 'extension/adapters.js')), 'per-domain extension adapter registry is missing');
check(read('src/components/ApplyFlowPanel.jsx').includes("id: 'firstName'") && read('src/components/ApplyFlowPanel.jsx').includes("id: 'lastName'"), 'Greenhouse first/last name handoff fields are missing');
const headers = vercel.headers?.flatMap((entry) => entry.headers || []) || [];
check(headers.some((header) => header.key === 'Content-Security-Policy'), 'Content-Security-Policy header is missing');
check(headers.some((header) => header.key === 'X-Content-Type-Options' && header.value === 'nosniff'), 'nosniff header is missing');
const trackedEnv = execFileSync('git', ['ls-files', '.env*'], { cwd: root, encoding: 'utf8' }).trim();
check(!trackedEnv, 'environment files must never be tracked');
const sourceText = fs.readdirSync(path.join(root, 'src'), { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => read(`src/${entry.name}`)).join('\n');
check(!/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|BEGIN PRIVATE KEY/.test(sourceText), 'server credentials or private key material found in client source');

if (failures.length) {
  console.error(`Production checklist failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Production checklist passed: secrets, PWA shell, feed provenance, freshness, ApplyFlow policy, extension permissions, and deployment headers are valid.');
