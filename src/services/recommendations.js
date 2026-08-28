const REMOTE_TERMS = /remote|worldwide|distributed|work from anywhere/i;
const COUNTRY_TERMS = /cameroon|africa|worldwide|anywhere|global|international/i;

function asText(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '');
}

function profileTerms(profile = {}) {
  return [profile.targetRole, profile.skills, profile.languages, profile.experience, profile.education]
    .flatMap((value) => asText(value).split(/[,;\n|]/))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 2);
}

function jobText(job = {}) {
  return [job.title, job.company, job.description, job.location, job.workMode, ...(job.tags || [])].join(' ').toLowerCase();
}

export function getEligibilitySummary(job = {}, mode = 'local') {
  const eligibility = String(job.remoteEligibility || '').toLowerCase();
  const text = jobText(job);
  if (mode !== 'remote') return { key: 'local', label: 'Local eligibility', detail: 'This view is filtered to Cameroon locations.' };
  if (eligibility === 'cameroon-eligible') return { key: 'eligible', label: 'Cameroon eligible', detail: 'The source explicitly includes Cameroon.' };
  if (eligibility === 'africa-eligible') return { key: 'eligible', label: 'Africa eligible', detail: 'The source includes Africa; confirm the exact country list before applying.' };
  if (eligibility === 'worldwide' || COUNTRY_TERMS.test(text) && /remote/i.test(text)) return { key: 'eligible', label: 'Worldwide signal', detail: 'The source indicates worldwide or international remote hiring; verify the final form.' };
  if (eligibility === 'restricted') return { key: 'restricted', label: 'Location restricted', detail: 'This role has a geographic restriction that may exclude Cameroon.' };
  return { key: 'unclear', label: 'Eligibility unclear', detail: 'No reliable Cameroon eligibility signal was found. Review the employer form before applying.' };
}

export function getFitScore(job = {}, profile = {}, mode = 'local') {
  const searchable = jobText(job);
  const terms = profileTerms(profile);
  const matchedTerms = terms.filter((term) => searchable.includes(term));
  let score = 0;
  if (profile.targetRole && searchable.includes(String(profile.targetRole).toLowerCase())) score += 35;
  if (matchedTerms.length) score += Math.min(35, matchedTerms.length * 10);
  if (mode === 'remote' && REMOTE_TERMS.test(searchable)) score += 15;
  if (job.sourceTrust === 'public-api' || job.sourceTrust === 'public-feed' || job.sourceTrust === 'verified') score += 10;
  if (getEligibilitySummary(job, mode).key === 'eligible') score += 5;
  return { score: Math.min(100, score), matchedTerms: matchedTerms.slice(0, 5) };
}

export function getRecommendationReasons(job = {}, profile = {}, mode = 'local') {
  const reasons = [];
  const terms = profileTerms(profile);
  const searchable = jobText(job);
  if (profile.targetRole && searchable.includes(String(profile.targetRole).toLowerCase())) reasons.push('Matches your target role');
  if (terms.some((term) => searchable.includes(term))) reasons.push('Overlaps with your profile skills');
  if (mode === 'remote' && REMOTE_TERMS.test(searchable)) reasons.push('Remote signal found');
  if (job.remoteEligibility === 'cameroon-eligible' || job.remoteEligibility === 'africa-eligible') reasons.push('Cameroon eligibility signal');
  if (job.timezoneOverlap) reasons.push(`Timezone: ${job.timezoneOverlap}`);
  if (job.sourceTrust === 'public-api' || job.sourceTrust === 'public-feed' || job.sourceTrust === 'verified') reasons.push('Trusted source metadata');
  return reasons.slice(0, 4);
}

export function getApplicationReadiness(job = {}, profile = {}, pack = {}, mode = 'local') {
  const reasons = [];
  const eligibility = getEligibilitySummary(job, mode);
  if (mode === 'remote' && eligibility.key !== 'eligible') reasons.push(eligibility.detail);
  if (!String(pack.fullName || profile.fullName || '').trim()) reasons.push('Add your full name.');
  if (!String(pack.email || profile.email || '').trim()) reasons.push('Add an email address.');
  if (!String(pack.targetRole || profile.targetRole || '').trim()) reasons.push('Add a target role.');
  return { canApprove: reasons.length === 0, reasons, eligibility };
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
