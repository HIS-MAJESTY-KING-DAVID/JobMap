import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS_FILE = path.join(ROOT, 'public', 'jobs.json');
const SOURCES_FILE = path.join(ROOT, 'data', 'sources.json');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required for database sync.');
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function request(resource, options = {}) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${resource}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${resource} failed: HTTP ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function splitSourceId(jobId) {
  return String(jobId || '').split(':', 1)[0];
}

function toDatabaseJob(job, sourceId) {
  return {
    source_id: sourceId,
    external_id: String(job.externalId || job.id),
    title: job.title,
    company: job.company,
    location: job.location || null,
    country: job.country || null,
    work_mode: job.workMode || null,
    employment_type: job.employmentType || null,
    description: job.description || null,
    application_url: job.url || job.applyUrl || null,
    application_endpoint: job.applyUrl || job.url || null,
    eligibility: {
      remoteEligibility: job.remoteEligibility || null,
      eligibleCountries: job.eligibleCountries || [],
      excludedCountries: job.excludedCountries || [],
      timezoneOverlap: job.timezoneOverlap || '',
      locationConfidence: job.locationConfidence || null,
      salary: job.salary || null,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      salaryCurrency: job.salaryCurrency || null,
      salaryPeriod: job.salaryPeriod || null,
      tags: job.tags || [],
      sourceTrust: job.sourceTrust || 'unverified',
    },
    published_at: isoOrNull(job.postedAt),
    expires_at: isoOrNull(job.expiresAt),
    last_seen_at: isoOrNull(job.lastVerifiedAt) || new Date().toISOString(),
    raw_payload: { id: job.id, source: job.source, sourceUrl: job.sourceUrl },
    updated_at: new Date().toISOString(),
  };
}

const [{ jobs = [] }, { sources = [] }] = await Promise.all([
  fs.readFile(JOBS_FILE, 'utf8').then(JSON.parse),
  fs.readFile(SOURCES_FILE, 'utf8').then(JSON.parse),
]);
const sourceRows = await request('job_sources?select=id,slug');
const sourceBySlug = new Map(sourceRows.map((source) => [source.slug, source.id]));
const configuredSourceIds = new Set(sources.filter((source) => source.enabled).map((source) => source.id));
const rows = jobs
  .filter((job) => configuredSourceIds.has(splitSourceId(job.id)))
  .map((job) => {
    const sourceId = sourceBySlug.get(splitSourceId(job.id));
    return sourceId ? toDatabaseJob(job, sourceId) : null;
  })
  .filter(Boolean);

if (rows.length) {
  await request('jobs?on_conflict=source_id,external_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

const now = new Date().toISOString();
await request(`jobs?expires_at=lt.${encodeURIComponent(now)}`, {
  method: 'DELETE',
  headers: { Prefer: 'return=minimal' },
});

console.log(`Supabase job sync complete: upserted ${rows.length} active jobs and removed listings expired before ${now}.`);
