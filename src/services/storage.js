const SAVED_JOBS_KEY = 'jobmap.savedJobs.v1';
const SAVED_SEARCHES_KEY = 'jobmap.savedSearches.v1';
const ALERTS_KEY = 'jobmap.alertsEnabled.v1';
const ALERTED_JOBS_KEY = 'jobmap.alertedJobs.v1';
const ALERTED_FOLLOWUPS_KEY = 'jobmap.alertedFollowups.v1';
const APPLICATIONS_KEY = 'jobmap.applications.v1';

function read(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage may be unavailable in private or restricted browsing contexts.
  }
}

export function getSavedJobs() {
  return read(SAVED_JOBS_KEY);
}

export function toggleSavedJob(job) {
  const saved = getSavedJobs();
  const exists = saved.some((item) => item.id === job.id);
  const next = exists ? saved.filter((item) => item.id !== job.id) : [job, ...saved];
  write(SAVED_JOBS_KEY, next);
  return next;
}

export function getSavedSearches() {
  return read(SAVED_SEARCHES_KEY);
}

export function saveSearch(search) {
  const saved = getSavedSearches().filter((item) => item.id !== search.id);
  const next = [search, ...saved].slice(0, 8);
  write(SAVED_SEARCHES_KEY, next);
  return next;
}

export function deleteSavedSearch(searchId) {
  const next = getSavedSearches().filter((item) => item.id !== searchId);
  write(SAVED_SEARCHES_KEY, next);
  return next;
}

export function getAlertsEnabled() {
  try {
    return window.localStorage.getItem(ALERTS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAlertsEnabled(enabled) {
  try {
    window.localStorage.setItem(ALERTS_KEY, String(enabled));
  } catch {
    // Local storage may be unavailable in private or restricted browsing contexts.
  }
  return enabled;
}

export function getAlertedJobIds() {
  return read(ALERTED_JOBS_KEY);
}

export function markJobsAlerted(jobIds) {
  const next = [...new Set([...getAlertedJobIds(), ...jobIds])].slice(-500);
  write(ALERTED_JOBS_KEY, next);
  return next;
}

export function getAlertedFollowUpIds() {
  return read(ALERTED_FOLLOWUPS_KEY);
}

export function markFollowUpsAlerted(applicationIds) {
  const next = [...new Set([...getAlertedFollowUpIds(), ...applicationIds])].slice(-500);
  write(ALERTED_FOLLOWUPS_KEY, next);
  return next;
}

export function getApplications() {
  return read(APPLICATIONS_KEY);
}

function makeEvent(type, metadata = {}) {
  return { id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, metadata, createdAt: new Date().toISOString() };
}

export function saveApplication(application) {
  const current = getApplications().filter((item) => item.id !== application.id && item.jobId !== application.jobId);
  const next = [{ ...application, events: [...(application.events || []), makeEvent('pack_saved', { status: application.status || 'draft' })], updatedAt: new Date().toISOString() }, ...current];
  write(APPLICATIONS_KEY, next);
  return next;
}

export function updateApplication(applicationId, patch) {
  const eventType = patch.status ? 'status_changed' : (patch.followUpAt !== undefined || patch.nextAction !== undefined || patch.followUpNote !== undefined ? 'follow_up_updated' : 'application_updated');
  const next = getApplications().map((application) => (
    application.id === applicationId
      ? { ...application, ...patch, events: [...(application.events || []), makeEvent(eventType, patch)], updatedAt: new Date().toISOString() }
      : application
  ));
  write(APPLICATIONS_KEY, next);
  return next;
}
