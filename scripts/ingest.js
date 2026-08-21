import fs from 'node:fs/promises';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedJobs } from '../src/services/seedJobs.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_FILE = path.join(ROOT, 'data', 'sources.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const JOBS_FILE = path.join(PUBLIC_DIR, 'jobs.json');
const META_FILE = path.join(PUBLIC_DIR, 'ingestion-meta.json');
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_DAYS = 21;

const locationFallbacks = {
  douala: { lat: 4.0511, lng: 9.7679, city: 'Douala', region: 'Littoral', country: 'Cameroon' },
  yaounde: { lat: 3.848, lng: 11.5021, city: 'Yaoundé', region: 'Centre', country: 'Cameroon' },
  bafoussam: { lat: 5.4781, lng: 10.4176, city: 'Bafoussam', region: 'West', country: 'Cameroon' },
  bamenda: { lat: 5.9597, lng: 10.1459, city: 'Bamenda', region: 'North-West', country: 'Cameroon' },
  buea: { lat: 4.1527, lng: 9.241, city: 'Buea', region: 'South-West', country: 'Cameroon' },
  limbe: { lat: 4.0236, lng: 9.2069, city: 'Limbe', region: 'South-West', country: 'Cameroon' },
  kumba: { lat: 4.6363, lng: 9.4469, city: 'Kumba', region: 'South-West', country: 'Cameroon' },
  kribi: { lat: 2.9406, lng: 9.9103, city: 'Kribi', region: 'South', country: 'Cameroon' },
  ebolowa: { lat: 2.9167, lng: 11.15, city: 'Ebolowa', region: 'South', country: 'Cameroon' },
  bertoua: { lat: 4.5773, lng: 13.6846, city: 'Bertoua', region: 'East', country: 'Cameroon' },
  ngaoundere: { lat: 7.3167, lng: 13.5833, city: 'Ngaoundéré', region: 'Adamawa', country: 'Cameroon' },
  garoua: { lat: 9.3014, lng: 13.3977, city: 'Garoua', region: 'North', country: 'Cameroon' },
  maroua: { lat: 10.591, lng: 14.3159, city: 'Maroua', region: 'Far North', country: 'Cameroon' },
  kousseri: { lat: 12.0769, lng: 15.0306, city: 'Kousseri', region: 'Far North', country: 'Cameroon' },
  nkongsamba: { lat: 5.6333, lng: 9.95, city: 'Nkongsamba', region: 'Littoral', country: 'Cameroon' },
  edea: { lat: 3.8, lng: 10.1333, city: 'Edéa', region: 'Littoral', country: 'Cameroon' },
  foumban: { lat: 5.7266, lng: 10.898, city: 'Foumban', region: 'West', country: 'Cameroon' },
  dschang: { lat: 5.452, lng: 10.057, city: 'Dschang', region: 'West', country: 'Cameroon' },
  mbalmayo: { lat: 3.5167, lng: 11.5, city: 'Mbalmayo', region: 'Centre', country: 'Cameroon' },
  sangmelima: { lat: 2.9333, lng: 11.9833, city: 'Sangmélima', region: 'South', country: 'Cameroon' },
  lagos: { lat: 6.5244, lng: 3.3792, city: 'Lagos', country: 'Nigeria' },
  accra: { lat: 5.6037, lng: -0.187, city: 'Accra', country: 'Ghana' },
  nairobi: { lat: -1.2921, lng: 36.8219, city: 'Nairobi', country: 'Kenya' },
};

const now = new Date();

function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function cleanText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function parseLocation(value, fallback = '') {
  const location = String(value || fallback).trim();
  const match = Object.entries(locationFallbacks).find(([key]) => location.toLowerCase().includes(key));
  return {
    location: location || 'Location not specified',
    ...(match ? match[1] : locationFallbacks.douala),
  };
}

function toIso(value, fallback = now) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function inferTags(title, description, extra = []) {
  const text = `${title} ${description}`.toLowerCase();
  const dictionary = {
    Software: ['software', 'developer', 'engineering', 'frontend', 'backend', 'full stack'],
    Data: ['data', 'analytics', 'machine learning', 'ml'],
    Product: ['product manager', 'product owner', 'product'],
    Design: ['design', 'ux', 'ui'],
    Sales: ['sales', 'business development', 'account executive'],
    Marketing: ['marketing', 'content', 'communications'],
    Finance: ['finance', 'accounting', 'accountant'],
    Operations: ['operations', 'project manager', 'logistics'],
  };
  return [...new Set([...extra, ...Object.entries(dictionary).filter(([, terms]) => terms.some((term) => text.includes(term))).map(([tag]) => tag)])].slice(0, 6);
}

function normalizeJob(raw, source) {
  const title = raw.title || raw.text || raw.name || 'Untitled role';
  const company = raw.company || source.company || source.label || 'Unknown employer';
  const locationData = parseLocation(raw.location, source.defaultLocation);
  const description = cleanText(raw.description || raw.content || 'No description supplied by the source.');
  const externalId = raw.externalId || raw.id || raw.url || `${title}-${company}-${locationData.location}`;
  const postedAt = toIso(raw.postedAt || raw.createdAt || raw.updatedAt, now);
  const expiresAt = new Date(new Date(postedAt).getTime() + DEFAULT_TTL_DAYS * DAY).toISOString();

  return {
    id: `${source.id}:${slugify(externalId)}`,
    externalId: String(externalId),
    title: cleanText(title),
    company: cleanText(company),
    location: locationData.location,
    city: locationData.city,
    region: locationData.region || raw.region || '',
    country: locationData.country,
    lat: Number(raw.lat ?? locationData.lat),
    lng: Number(raw.lng ?? locationData.lng),
    description: description.slice(0, 320),
    url: raw.url || raw.applyUrl || '#',
    applyUrl: raw.applyUrl || raw.url || '#',
    source: source.label,
    sourceUrl: source.url || raw.url || '#',
    postedAt,
    lastVerifiedAt: now.toISOString(),
    expiresAt,
    employmentType: raw.employmentType || raw.type || 'Full-time',
    workMode: raw.workMode || 'Not listed',
    locationConfidence: raw.locationConfidence || (raw.location ? 'source' : 'estimated'),
    tags: inferTags(title, description, raw.tags || []),
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { 
      signal: controller.signal, 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      } 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGreenhouse(source) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.boardToken)}/jobs?content=true`;
  const payload = JSON.parse(await fetchText(url));
  return (payload.jobs || []).map((job) => ({
    externalId: job.id,
    title: job.title,
    location: job.location?.name,
    description: job.content,
    url: job.absolute_url,
    applyUrl: job.absolute_url,
    postedAt: job.updated_at,
    tags: [...(job.departments || []).map((item) => item.name), ...(job.offices || []).map((item) => item.name)],
  }));
}

async function fetchLever(source) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json`;
  const payload = JSON.parse(await fetchText(url));
  return (Array.isArray(payload) ? payload : []).map((job) => ({
    externalId: job.id,
    title: job.text,
    location: job.categories?.location || (job.categories?.allLocations || []).join(', '),
    description: job.descriptionPlain || job.description,
    url: job.hostedUrl,
    applyUrl: job.applyUrl || job.hostedUrl,
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
    employmentType: job.categories?.commitment,
    tags: [job.categories?.team, job.categories?.department].filter(Boolean),
  }));
}

async function fetchReliefWeb(source) {
  const appname = process.env.RELIEFWEB_APPNAME || source.appname;
  if (!appname || appname.startsWith('REPLACE_')) throw new Error('ReliefWeb requires an approved appname in source configuration or RELIEFWEB_APPNAME');
  const url = new URL('https://api.reliefweb.int/v2/jobs');
  url.searchParams.set('appname', appname);
  url.searchParams.set('filter[field]', 'country');
  url.searchParams.set('filter[value]', 'Cameroon');
  url.searchParams.set('profile', 'full');
  url.searchParams.set('preset', 'latest');
  url.searchParams.set('limit', '1000');
  const payload = JSON.parse(await fetchText(url.toString()));
  return (payload.data || []).map((item) => {
    const fields = item.fields || {};
    const locations = Array.isArray(fields.location) ? fields.location.map((entry) => entry.name || entry).join(', ') : fields.location?.name || fields.location;
    const organization = Array.isArray(fields.organization) ? fields.organization.map((entry) => entry.name || entry).join(', ') : fields.organization?.name || fields.organization;
    return {
      externalId: item.id,
      title: fields.title,
      company: organization || 'ReliefWeb partner',
      location: locations || 'Cameroon',
      description: fields.description,
      url: fields.url || `https://reliefweb.int/node/${item.id}`,
      applyUrl: fields.url || `https://reliefweb.int/node/${item.id}`,
      postedAt: fields.date?.created || fields.date?.original,
      employmentType: fields.type?.name,
      tags: [fields.career_category?.name, fields.experience?.name].filter(Boolean),
    };
  });
}

function fetchRss(source) {
  return fetchText(source.url).then((xml) => {
    const entries = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(item|entry)>/gi) || [];
    return entries.map((entry) => {
      const urlMatch = entry.match(/<(?:link|guid)(?:\s[^>]*)?>([\s\S]*?)<\//i);
      return {
        externalId: firstText(entry, 'guid') || firstText(entry, 'id'),
        title: firstText(entry, 'title'),
        location: firstText(entry, 'location') || source.defaultLocation,
        description: firstText(entry, 'description') || firstText(entry, 'summary') || firstText(entry, 'content'),
        url: urlMatch ? cleanText(urlMatch[1]) : '#',
        postedAt: firstText(entry, 'pubDate') || firstText(entry, 'published') || firstText(entry, 'updated'),
      };
    });
  });
}

async function loadSources() {
  const config = JSON.parse(await fs.readFile(SOURCES_FILE, 'utf8'));
  return config.sources || [];
}

async function loadExisting() {
  try {
    const payload = JSON.parse(await fs.readFile(JOBS_FILE, 'utf8'));
    return Array.isArray(payload) ? payload : payload.jobs || [];
  } catch {
    return seedJobs;
  }
}

function dedupeKey(job) {
  return `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/[^a-z0-9|]+/g, '');
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const sources = await loadSources();
  const existing = await loadExisting();
  const allJobs = new Map(existing.map((job) => [dedupeKey(job), job]));
  const sourceReports = [];

  for (const source of sources.filter((item) => item.enabled)) {
    const startedAt = Date.now();
    try {
      const rawJobs = source.type === 'greenhouse'
        ? await fetchGreenhouse(source)
        : source.type === 'lever'
          ? await fetchLever(source)
          : source.type === 'reliefweb'
            ? await fetchReliefWeb(source)
            : await fetchRss(source);
      const normalized = rawJobs.map((job) => normalizeJob(job, source));
      normalized.forEach((job) => allJobs.set(dedupeKey(job), job));
      sourceReports.push({ id: source.id, label: source.label, status: 'ok', fetched: normalized.length, durationMs: Date.now() - startedAt });
    } catch (error) {
      sourceReports.push({ id: source.id, label: source.label, status: 'error', error: error.message, durationMs: Date.now() - startedAt });
    }
  }

  const jobs = [...allJobs.values()]
    .filter((job) => !job.expiresAt || new Date(job.expiresAt) >= now)
    .sort((a, b) => new Date(b.lastVerifiedAt || b.postedAt || 0) - new Date(a.lastVerifiedAt || a.postedAt || 0));

  await fs.writeFile(JOBS_FILE, `${JSON.stringify(jobs, null, 2)}\n`);
  await fs.writeFile(META_FILE, `${JSON.stringify({ generatedAt: now.toISOString(), jobs: jobs.length, sources: sourceReports }, null, 2)}\n`);
  console.log(`Published ${jobs.length} active jobs from ${sourceReports.length} enabled sources.`);
  sourceReports.forEach((report) => console.log(`${report.status.toUpperCase()} ${report.label}: ${report.fetched ?? 0} jobs`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
