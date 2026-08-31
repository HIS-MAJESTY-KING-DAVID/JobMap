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
  let str = String(value);
  str = str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? cleanText(match[1]) : '';
}

const frenchMonths = {
  janvier: 0,
  février: 1,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
  decembre: 11,
};

function parseFrenchDate(value) {
  const match = String(value || '').toLowerCase().match(/(\d{1,2})\s+([a-zûé]+)\s+(\d{4})/i);
  if (!match) return '';
  const month = frenchMonths[match[2]];
  if (month === undefined) return '';
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1]), 12)).toISOString();
}

function parseLocation(value, fallback = '', rawCountry = '') {
  const location = String(value || fallback).trim();
  const match = Object.entries(locationFallbacks).find(([key]) => location.toLowerCase().includes(key));
  return {
    location: location || 'Location not specified',
    ...(match ? match[1] : {}),
    country: match?.[1]?.country || rawCountry || (/cameroon/i.test(location) ? 'Cameroon' : ''),
  };
}

function toIso(value, fallback = now) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function splitValues(value) {
  if (Array.isArray(value)) return value.flatMap((item) => splitValues(item));
  return String(value || '')
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSalary(raw) {
  if (raw.salary) return String(raw.salary);
  if (raw.salaryMin == null && raw.salaryMax == null) return null;
  const currency = raw.salaryCurrency || 'USD';
  const period = raw.salaryPeriod ? `/${raw.salaryPeriod}` : '';
  const min = raw.salaryMin != null ? raw.salaryMin : '';
  const max = raw.salaryMax != null ? raw.salaryMax : '';
  return `${currency} ${min}${max ? `–${max}` : '+'}${period}`;
}

function inferRemoteEligibility(raw, source) {
  const explicit = String(raw.remoteEligibility || '').toLowerCase();
  if (['cameroon-eligible', 'africa-eligible', 'worldwide', 'restricted', 'unclear'].includes(explicit)) return explicit;
  const text = [
    raw.location,
    raw.jobGeo,
    raw.candidateRequiredLocation,
    raw.eligibleCountries,
    raw.excludedCountries,
    raw.description,
    raw.title,
  ].flatMap((value) => splitValues(value)).join(' ').toLowerCase();
  if (/not eligible|excluded|only in the (us|usa|uk|europe)|us only|europe only/.test(text)) return 'restricted';
  if (/cameroon/.test(text)) return 'cameroon-eligible';
  if (/africa|sub-saharan/.test(text)) return 'africa-eligible';
  if (/worldwide|work from anywhere|anywhere in the world|global remote|distributed team/.test(text)) return 'worldwide';
  return source.remote || raw.workMode === 'Remote' ? 'unclear' : null;
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
    const locationData = parseLocation(raw.location, source.defaultLocation, raw.country);
  const remoteEligibility = inferRemoteEligibility(raw, source);

  const description = cleanText(raw.description || raw.content || 'No description supplied by the source.');
  const externalId = raw.externalId || raw.id || raw.url || `${title}-${company}-${locationData.location}`;
    const postedAt = toIso(raw.postedAt || raw.createdAt || raw.updatedAt || raw.publicationDate || raw.pubDate || raw.date, now);

  const expiresAt = raw.expiresAt ? toIso(raw.expiresAt) : new Date(new Date(postedAt).getTime() + DEFAULT_TTL_DAYS * DAY).toISOString();

  return {
    id: `${source.id}:${slugify(externalId)}`,
    externalId: String(externalId),
    title: cleanText(title),
    company: cleanText(company),
    location: locationData.location,
    city: locationData.city,
    region: locationData.region || raw.region || '',
        country: locationData.country || raw.country || (source.remote ? 'Worldwide' : 'Cameroon'),

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
    salary: formatSalary(raw),
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    salaryCurrency: raw.salaryCurrency || null,
    salaryPeriod: raw.salaryPeriod || null,
    workMode: raw.workMode || (source.remote ? 'Remote' : 'Not listed'),
    remoteEligibility,
    eligibleCountries: splitValues(raw.eligibleCountries),
    excludedCountries: splitValues(raw.excludedCountries),
    timezoneOverlap: raw.timezoneOverlap || '',
    sourceTrust: raw.sourceTrust || source.sourceTrust || 'unverified',
    locationConfidence: raw.locationConfidence || (raw.location ? 'source' : source.remote ? 'source' : 'estimated'),
    tags: inferTags(title, description, raw.tags || []),

  };
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'JobMap/1.0 (+https://jobmap-ten.vercel.app/; contact: jobmap-feed-bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/json, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      if (response.ok) return await response.text();
      lastError = new Error(`HTTP ${response.status}`);
      if (response.status < 500 && response.status !== 406 && response.status !== 429) throw lastError;
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError' && attempt === 2) throw new Error(`Timed out fetching ${url}`);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

async function withDeadline(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out fetching ${label}`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchJobicy(source) {
  const payload = await fetchJson(source.url);
  return (payload.jobs || []).map((job) => ({
    externalId: job.id,
    title: job.jobTitle,
    company: job.companyName,
    location: job.jobGeo || 'Worldwide remote',
    description: job.jobDescription || job.jobExcerpt,
    url: job.url,
    applyUrl: job.url,
    postedAt: job.pubDate,
    employmentType: Array.isArray(job.jobType) ? job.jobType.join(', ') : job.jobType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    jobGeo: job.jobGeo,
    tags: [...(job.jobIndustry || []), job.jobLevel].filter(Boolean),
  }));
}

async function fetchRemotive(source) {
  const payload = await fetchJson(source.url);
  return (payload.jobs || []).map((job) => ({
    externalId: job.id,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Worldwide remote',
    candidateRequiredLocation: job.candidate_required_location,
    description: job.description,
    url: job.url,
    applyUrl: job.url,
    postedAt: job.publication_date,
    employmentType: job.job_type,
    salary: job.salary,
    tags: [job.category, ...(job.tags || [])].filter(Boolean),
  }));
}

async function fetchRemoteOk(source) {
  const payload = await fetchJson(source.url);
  return (Array.isArray(payload) ? payload : []).filter((job) => job.id || job.slug).map((job) => ({
    externalId: job.id || job.slug,
    title: job.position || job.title,
    company: job.company,
    location: job.location || (job.tags || []).join(', ') || 'Worldwide remote',
    description: job.description,
    url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
    applyUrl: job.apply_url || job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
    postedAt: job.date || (job.epoch ? new Date(Number(job.epoch) * 1000).toISOString() : undefined),
    salary: job.salary_min || job.salary_max ? `${job.salary_min || ''}${job.salary_max ? `–${job.salary_max}` : '+'} ${job.salary_currency || 'USD'}` : null,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salaryCurrency: job.salary_currency,
    jobGeo: job.location,
    tags: job.tags || [],
  }));
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

async function fetchAshby(source) {
  const boardName = source.boardName || source.boardToken || source.site;
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}?includeCompensation=true`;
  const payload = JSON.parse(await fetchText(url));
  return (payload.jobs || []).map((job) => ({
    externalId: job.id,
    title: job.title,
    company: source.company || source.owner || 'Preply',
    location: job.locationName || (job.secondaryLocations || []).map((item) => item.locationName || item.name || item).join(', ') || 'Worldwide remote',
    description: job.descriptionPlain || job.descriptionHtml,
    url: job.jobUrl,
    applyUrl: job.applyUrl || job.jobUrl,
    postedAt: job.publishedAt,
    employmentType: job.employmentType,
    workMode: job.isRemote ? 'Remote' : (job.workplaceType || 'Not listed'),
    tags: [job.department, job.team, job.workplaceType].filter(Boolean),
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
            const title = firstText(entry, 'title');
      const creator = firstText(entry, 'dc:creator') || firstText(entry, 'creator');
      const titleCompany = title.match(/^([^:]{2,90}):\s+/)?.[1] || '';
      const urlMatch = entry.match(/<(?:link|guid)(?:\s[^>]*)?>([\s\S]*?)<\//i);
      return {
        externalId: firstText(entry, 'guid') || firstText(entry, 'id') || urlMatch?.[1],
        title: titleCompany ? title.slice(titleCompany.length + 1).trim() : title,
        company: creator || titleCompany || source.company,
        location: firstText(entry, 'location') || source.defaultLocation,
        description: firstText(entry, 'description') || firstText(entry, 'summary') || firstText(entry, 'content'),
        url: urlMatch ? cleanText(urlMatch[1]) : '#',
        postedAt: firstText(entry, 'pubDate') || firstText(entry, 'published') || firstText(entry, 'updated'),
      };

    });
  });
}

function fetchHackerNews(source) {
  return fetchText(source.url).then((xml) => {
    const entries = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(item|entry)>/gi) || [];
    return entries.map((entry) => {
      const rawTitle = firstText(entry, 'title');
      let company = source.company || 'Hacker News Startup';
      let title = rawTitle;

      const match = rawTitle.match(/^([\s\S]+?)\s+(?:[iI]s\s+)?[hH]iring(?:\s*–\s*|\s*-\s*|\s+)?([\s\S]*)$/);
      if (match) {
        company = match[1].trim();
        let role = match[2].trim();
        if (role) {
          role = role.replace(/^(?:a|an|the)\s+/i, '');
          role = role.charAt(0).toUpperCase() + role.slice(1);
          title = role;
        } else {
          title = 'Software Engineer / Various Roles';
        }
      }

      const urlMatch = entry.match(/<(?:link|guid)(?:\s[^>]*)?>([\s\S]*?)<\//i);
      const link = urlMatch ? cleanText(urlMatch[1]) : '#';

      return {
        externalId: firstText(entry, 'guid') || firstText(entry, 'id') || link,
        title,
        company,
        location: firstText(entry, 'location') || source.defaultLocation,
        description: firstText(entry, 'description') || firstText(entry, 'summary') || firstText(entry, 'content'),
        url: link,
        applyUrl: link,
        postedAt: firstText(entry, 'pubDate') || firstText(entry, 'published') || firstText(entry, 'updated'),
      };
    });
  });
}

function parseFneCards(html, source) {
  const cards = html.split(/<div class="offre-card h-100">/i).slice(1);
  return cards.map((card) => {
    const url = firstMatch(card, /href="(https:\/\/emploi\.fnecm\.org\/offre\/[^"?#]+)"/i);
    const title = firstMatch(card, /<div class="offre-card-metier">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const location = firstMatch(card, /<!-- Lieu -->[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const contract = firstMatch(card, /<!-- Badges type contrat \+ catégorie -->[\s\S]*?<span class="badge"[^>]*>([\s\S]*?)<\/span>/i);
    const description = firstMatch(card, /class="offre-card-extrait">([\s\S]*?)<\/p>/i);
    const agency = firstMatch(card, /<!-- Agence \+ postes -->[\s\S]*?<span class="text-muted">([\s\S]*?)<\/span>/i);
    const positionsText = firstMatch(card, /<span class="text-muted">(\d+)\s+postes<\/span>/i);
    return {
      externalId: url || title,
      title,
      location,
      description,
      company: source.company || source.label,
      url,
      applyUrl: url,
      employmentType: contract,
      tags: [agency, positionsText ? `${positionsText} postes` : ''].filter(Boolean),
    };
  }).filter((job) => job.url && job.title);
}

function parseFneDetail(html) {
  const description = firstMatch(html, /<h5[^>]*>[\s\S]*?Missions \/ Tâches[\s\S]*?<\/h5>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);
  const employmentType = firstMatch(html, /Type de contrat<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i);
  const location = firstMatch(html, /Lieu de travail<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i);
  const postedAt = parseFrenchDate(firstMatch(html, /Date de dépôt<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i));
  const expiresAt = parseFrenchDate(firstMatch(html, /Date de validité<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i));
  const positions = firstMatch(html, /Poste\(s\) disponible\(s\)<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i);
  return { description, employmentType, location, postedAt, expiresAt, positions };
}

async function fetchFne(source) {
  const firstUrl = new URL(source.url);
  firstUrl.searchParams.set('par_page', source.pageSize || '12');
  firstUrl.searchParams.set('page', '1');
  const firstHtml = await withDeadline(fetchText(firstUrl.toString()), 15_000, firstUrl.toString());
  const pageCount = 1;
  const pages = [firstHtml];
  for (let page = 2; page <= pageCount; page += 1) {
    const pageUrl = new URL(firstUrl);
    pageUrl.searchParams.set('page', String(page));
    try {
      pages.push(await withDeadline(fetchText(pageUrl.toString()), 15_000, pageUrl.toString()));
    } catch (error) {
      console.error(`[ingest] ${source.id} page ${page} skipped: ${error.message}`);
    }
  }
  const cards = pages.flatMap((html) => parseFneCards(html, source)).slice(0, 12);
  const detailed = [];
  for (let index = 0; index < cards.length; index += 4) {
    const batch = cards.slice(index, index + 4);
    const details = await Promise.all(batch.map(async (card) => {
      try {
        return parseFneDetail(await withDeadline(fetchText(card.url), 15_000, card.url));
      } catch {
        return {};
      }
    }));
    detailed.push(...batch.map((card, detailIndex) => ({ ...card, ...details[detailIndex] })));
  }
  return detailed;
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
    console.log(`[ingest] ${source.id} start`);
    try {
            const rawJobs = source.type === 'greenhouse'
        ? await fetchGreenhouse(source)
        : source.type === 'lever'
          ? await fetchLever(source)
          : source.type === 'ashby'
            ? await fetchAshby(source)
            : source.type === 'reliefweb'
              ? await fetchReliefWeb(source)
              : source.type === 'fne'
                ? await fetchFne(source)
                : source.type === 'jobicy'
                  ? await fetchJobicy(source)
                  : source.type === 'remotive'
                    ? await fetchRemotive(source)
                    : source.type === 'remoteok'
                      ? await fetchRemoteOk(source)
                      : source.type === 'hackernews'
                        ? await fetchHackerNews(source)
                        : await fetchRss(source);

      const normalized = rawJobs.map((job) => normalizeJob(job, source));
      normalized.forEach((job) => allJobs.set(dedupeKey(job), job));
      sourceReports.push({ id: source.id, label: source.label, status: 'ok', fetched: normalized.length, durationMs: Date.now() - startedAt });
      console.log(`[ingest] ${source.id} ok (${normalized.length} jobs, ${Date.now() - startedAt}ms)`);
    } catch (error) {
      sourceReports.push({ id: source.id, label: source.label, status: 'error', error: error.message, durationMs: Date.now() - startedAt });
      console.error(`[ingest] ${source.id} error: ${error.message}`);
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
