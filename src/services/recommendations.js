const REMOTE_TERMS = /remote|worldwide|distributed|work from anywhere/i;

function asText(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '');
}

function profileTerms(profile = {}) {
  return [profile.targetRole, profile.skills, profile.languages, profile.experience, profile.education]
    .flatMap((value) => asText(value).split(/[,;\n|]/))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 2);
}

export function getRecommendationReasons(job = {}, profile = {}, mode = 'local') {
  const reasons = [];
  const terms = profileTerms(profile);
  const searchable = [job.title, job.company, job.description, ...(job.tags || [])].join(' ').toLowerCase();
  if (profile.targetRole && searchable.includes(String(profile.targetRole).toLowerCase())) reasons.push('Matches your target role');
  if (terms.some((term) => searchable.includes(term))) reasons.push('Overlaps with your profile skills');
  if (mode === 'remote' && REMOTE_TERMS.test([job.workMode, job.location, job.description, ...(job.tags || [])].join(' '))) reasons.push('Remote signal found');
  if (job.remoteEligibility === 'cameroon-eligible' || job.remoteEligibility === 'africa-eligible') reasons.push('Cameroon eligibility signal');
  if (job.timezoneOverlap) reasons.push(`Timezone: ${job.timezoneOverlap}`);
  if (job.sourceTrust === 'public-api' || job.sourceTrust === 'public-feed' || job.sourceTrust === 'verified') reasons.push('Trusted source metadata');
  return reasons.slice(0, 4);
}

export function getExecutionRoute(job = {}) {
  const mode = String(job.applicationMode || job.application_mode || '').toLowerCase();
  if (mode.includes('api') || job.machineEndpoint) return { key: 'api', label: 'Direct adapter candidate', detail: 'Approved endpoint metadata is available.' };
  if (mode.includes('extension') || mode.includes('browser')) return { key: 'extension', label: 'Browser-assisted candidate', detail: 'Safe fields can be prepared for the companion extension.' };
  if (job.applyUrl && job.applyUrl !== '#') return { key: 'manual', label: 'Manual source fallback', detail: 'Open the employer form after reviewing your pack.' };
  return { key: 'unsupported', label: 'Application route unclear', detail: 'Save the job while the route is verified.' };
}

export function getProfileCompletion(profile = {}, cvDocuments = []) {
  const checks = [
    ['contact', Boolean(profile.fullName && profile.email && profile.phone), 'Add contact details'],
    ['target', Boolean(profile.targetRole), 'Set a target role'],
    ['skills', Boolean(profile.skills), 'Add skills'],
    ['experience', Boolean(profile.experience), 'Add experience'],
    ['education', Boolean(profile.education), 'Add education'],
    ['links', Boolean(profile.linkedin || profile.portfolio), 'Add a professional link'],
    ['cv', cvDocuments.length > 0, 'Upload an approved CV'],
    ['preferences', Boolean(profile.country && profile.timezone), 'Confirm location and timezone'],
  ];
  const complete = checks.filter(([, ok]) => ok).length;
  return { checks, complete, total: checks.length, percent: Math.round((complete / checks.length) * 100) };
}
