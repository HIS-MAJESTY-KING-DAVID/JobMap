import { seedJobs } from './seedJobs.js';
import { distanceInKm } from './geo.js';

const JOBS_URL = '/jobs.json';

function normalizeJob(job) {
  return {
    ...job,
    id: String(job.id),
    title: job.title || 'Untitled role',
    company: job.company || 'Unknown employer',
    location: job.location || job.city || 'Location not specified',
    city: job.city || '',
    region: job.region || '',
    country: job.country || 'Cameroon',
    description: job.description || 'No description supplied by the source.',
    url: job.url || job.applyUrl || '#',
    applyUrl: job.applyUrl || job.url || '#',
    source: job.source || 'Unknown source',
    sourceUrl: job.sourceUrl || job.url || '#',
    postedAt: job.postedAt || null,
    lastVerifiedAt: job.lastVerifiedAt || null,
    expiresAt: job.expiresAt || null,
    salary: job.salary || null,
    status: job.status || 'Active',
    locationConfidence: job.locationConfidence || (job.source === 'JobMap curated' ? 'estimated' : job.lat && job.lng ? 'source' : 'estimated'),
    tags: Array.isArray(job.tags) ? job.tags : [],
  };
}

function isActive(job, now = new Date()) {
  if (!job.expiresAt) return true;
  return new Date(job.expiresAt) >= now;
}

export function isRemoteJob(job) {
  const searchable = [job.title, job.company, job.location, job.description, job.source, ...(job.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return job.workMode === 'Remote'
    || /remote|work from anywhere|worldwide|distributed|we work remotely/.test(searchable);
}

export async function fetchJobs({ signal } = {}) {
  try {
    const response = await fetch(JOBS_URL, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Published jobs feed returned ${response.status}`);
    const payload = await response.json();
    const jobs = Array.isArray(payload) ? payload : payload.jobs;
    if (!Array.isArray(jobs)) throw new Error('Published jobs feed has an invalid shape');
    return jobs.map(normalizeJob).filter(isActive);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return seedJobs.map(normalizeJob).filter(isActive);
  }
}

export function filterJobs(
  jobs,
    { query = '', workMode = 'All', employmentType = 'All', origin = null, radiusKm = 0, mode = 'local', eligibleOnly = false } = {},

) {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs
    .map((job) => ({ ...job, distanceKm: origin?.id !== 'all' ? distanceInKm(origin, job) : null }))
    .filter((job) => {
      const searchable = [
        job.title,
        job.company,
        job.location,
        job.region,
        job.description,
        ...(job.tags || []),
      ].join(' ').toLowerCase();

      const queryMatches = !normalizedQuery || searchable.includes(normalizedQuery);
            const modeMatches = mode === 'remote' ? isRemoteJob(job) : mode !== 'local' || !isRemoteJob(job);
      const workModeMatches = workMode === 'All' || job.workMode === workMode;
      const employmentMatches = employmentType === 'All' || job.employmentType === employmentType;
      const eligibilityMatches = !eligibleOnly || ['cameroon-eligible', 'africa-eligible', 'worldwide'].includes(job.remoteEligibility);

      const hasCoordinates = Number.isFinite(job.distanceKm);
      const radiusMatches = origin?.id === 'all' || radiusKm === 0 || (hasCoordinates && job.distanceKm <= radiusKm);

            return modeMatches && queryMatches && workModeMatches && employmentMatches && eligibilityMatches && radiusMatches;

    })
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      return new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
    });
}

export function getNewestDate(jobs) {
  return jobs
    .map((job) => job.lastVerifiedAt || job.postedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
}
