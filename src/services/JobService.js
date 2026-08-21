import { seedJobs } from './seedJobs';

const JOBS_URL = '/jobs.json';

function normalizeJob(job) {
  return {
    ...job,
    id: String(job.id),
    title: job.title || 'Untitled role',
    company: job.company || 'Unknown employer',
    location: job.location || job.city || 'Location not specified',
    city: job.city || '',
    country: job.country || '',
    description: job.description || 'No description supplied by the source.',
    url: job.url || job.applyUrl || '#',
    applyUrl: job.applyUrl || job.url || '#',
    source: job.source || 'Unknown source',
    sourceUrl: job.sourceUrl || job.url || '#',
    postedAt: job.postedAt || null,
    lastVerifiedAt: job.lastVerifiedAt || null,
    expiresAt: job.expiresAt || null,
    tags: Array.isArray(job.tags) ? job.tags : [],
  };
}

function isActive(job, now = new Date()) {
  if (!job.expiresAt) return true;
  return new Date(job.expiresAt) >= now;
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

export function filterJobs(jobs, { query = '', workMode = 'All', employmentType = 'All' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs.filter((job) => {
    const searchable = [
      job.title,
      job.company,
      job.location,
      job.description,
      ...(job.tags || []),
    ].join(' ').toLowerCase();

    const queryMatches = !normalizedQuery || searchable.includes(normalizedQuery);
    const workModeMatches = workMode === 'All' || job.workMode === workMode;
    const employmentMatches = employmentType === 'All' || job.employmentType === employmentType;

    return queryMatches && workModeMatches && employmentMatches;
  });
}

export function getNewestDate(jobs) {
  return jobs
    .map((job) => job.lastVerifiedAt || job.postedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
}
