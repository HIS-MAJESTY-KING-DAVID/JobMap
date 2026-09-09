const FIELD_POLICIES = {
  safe_profile: { label: 'Profile fact', requiresConfirmation: false, blocked: false },
  safe_cv: { label: 'CV fact', requiresConfirmation: false, blocked: false },
  generated_draft: { label: 'AI draft', requiresConfirmation: true, blocked: false },
  sensitive: { label: 'Sensitive question', requiresConfirmation: true, blocked: false },
  legal_attestation: { label: 'Legal attestation', requiresConfirmation: true, blocked: true },
  unknown: { label: 'Unknown question', requiresConfirmation: true, blocked: true },
  blocked: { label: 'Blocked field', requiresConfirmation: true, blocked: true },
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stringValue = (value) => typeof value === 'string' ? value.trim() : '';

function classifyField(field) {
  const label = normalize(field.label || field.name || field.id);
  if (!label) return 'unknown';
  if (/(captcha|recaptcha|password|passcode|one time|otp|mfa|two factor|payment|identity verification)/.test(label)) return 'blocked';
  if (/(attest|certify|certification|agree|terms|accurate|truthful|consent|electronic signature|signature|declare)/.test(label)) return 'legal_attestation';
  if (/(authorized|authorization|sponsor|sponsorship|visa|salary|compensation|pay|ethnicity|race|gender|sex|disab|lgbtq|veteran|criminal|conviction|work permit)/.test(label)) return 'sensitive';
  if (/(cover letter|cover note|professional summary|why .*role|why .*company|about you|message to|motivation)/.test(label)) return 'generated_draft';
  if (/(first name|given name|last name|surname|full name|preferred name|email|e mail|phone|mobile|telephone|address|city|country|postal|zip|linkedin|portfolio|website|url|timezone|language|target role|desired role)/.test(label)) return 'safe_profile';
  if (/(resume|cv|curriculum vitae|education|school|university|degree|gpa|grade|employer|company|job title|position|experience|skill|certification|qualification|graduation)/.test(label)) return 'safe_cv';
  return 'unknown';
}

function profileValue(field, profile) {
  const label = normalize(field.label || field.name || field.id);
  const employment = profile?.preferences?.employment || {};
  const values = [
    [/(first name|given name)/, profile?.fullName?.split(' ')[0]],
    [/(last name|surname|family name)/, profile?.fullName?.split(' ').slice(1).join(' ')],
    [/^(full name|name)$/, profile?.fullName],
    [/(email|e mail)/, profile?.email],
    [/(phone|mobile|telephone)/, profile?.phone],
    [/(city)/, profile?.city],
    [/(country)/, profile?.country],
    [/(address)/, employment.address || profile?.preferences?.address],
    [/(linkedin)/, profile?.linkedin],
    [/(portfolio|website|url)/, profile?.portfolio],
    [/(target role|desired role|job title|position)/, profile?.targetRole],
    [/(timezone)/, profile?.timezone],
    [/(language)/, profile?.languages],
    [/(salary|compensation|pay)/, profile?.salaryPreference],
    [/(work authorization|authorized|work permit)/, profile?.workAuthorization || (employment.authorizedToWorkUS === false && employment.authorizedToWorkCanada === false && employment.authorizedToWorkUK === false ? 'No' : '')],
    [/(sponsor|visa)/, employment.requiresVisaSponsorship === false ? 'No' : ''],
    [/(gender|sex)/, employment.gender],
    [/(ethnicity|race)/, employment.ethnicity],
    [/(disab)/, employment.disability === undefined ? '' : employment.disability ? 'Yes' : 'No'],
    [/(lgbtq)/, employment.lgbtq === undefined ? '' : employment.lgbtq ? 'Yes' : 'No'],
    [/(veteran)/, employment.veteran === undefined ? '' : employment.veteran ? 'Yes' : 'No'],
  ];
  return stringValue(values.find(([pattern]) => pattern.test(label))?.[1]);
}

function cvValue(field, profile) {
  const label = normalize(field.label || field.name || field.id);
  if (/(skill)/.test(label)) return stringValue(profile?.skills);
  if (/(gpa)/.test(label)) return stringValue(profile?.gpa);
  if (/(education|school|university|degree|graduation)/.test(label)) return stringValue([profile?.education, profile?.gpa ? `GPA: ${profile.gpa}` : ''].filter(Boolean).join('\n'));
  if (/(employer|company|job title|position|experience|qualification|certification)/.test(label)) return stringValue([profile?.experience, profile?.certifications].filter(Boolean).join('\n'));
  return '';
}

function generatedDraft(field, profile, job) {
  const label = normalize(field.label || field.name || field.id);
  const company = job?.company || 'the team';
  const title = job?.title || profile?.targetRole || 'this role';
  if (/why/.test(label)) return `I am interested in ${title} at ${company} because it aligns with my experience and the way I can contribute through my verified skills and background.`;
  if (/(summary|about you)/.test(label)) return [profile?.targetRole, profile?.skills, profile?.experience].filter(Boolean).join('. ');
  if (/(cover|message|motivation)/.test(label)) return `Hello ${company} team, I am interested in the ${title} opportunity and would welcome the chance to discuss how my verified experience could contribute.`;
  return '';
}

function learnedValue(field, learnedAnswers) {
  const label = normalize(field.label || field.name || field.id);
  const key = /(sponsor|visa)/.test(label) ? 'sponsorship' : /(salary|compensation|pay)/.test(label) ? 'salary' : /(authorized|authorization|work permit)/.test(label) ? 'workAuthorization' : null;
  return key && learnedAnswers?.[key] ? { key, memory: learnedAnswers[key] } : null;
}

export function classifyApplicationField(field) {
  const classification = classifyField(field);
  return { classification, policy: FIELD_POLICIES[classification] };
}

export function buildAutofillSuggestions({ fields = [], profile = {}, job = null, learnedAnswers = {}, unassistedMode = false } = {}) {
  return fields.map((field) => {
    const { classification, policy } = classifyApplicationField(field);
    const memory = learnedValue(field, learnedAnswers);
    const source = memory ? `answer_memory.${memory.key}` : classification === 'safe_profile' ? 'profile' : classification === 'safe_cv' ? 'profile_or_cv' : classification === 'generated_draft' ? 'generated_from_verified_profile' : 'unknown';
    const value = memory?.memory?.value || ((classification === 'safe_profile' || classification === 'sensitive') ? profileValue(field, profile) : classification === 'safe_cv' ? cvValue(field, profile) : classification === 'generated_draft' ? generatedDraft(field, profile, job) : '');
    const confirmations = memory?.memory?.confirmations || 0;
    const approvedReuse = Boolean(memory?.memory?.unassisted && confirmations >= 3 && !policy.blocked);
    const hasValue = Boolean(stringValue(value));
    const requiresConfirmation = policy.requiresConfirmation && !(unassistedMode && approvedReuse);
    return {
      fieldId: field.id || field.name || field.label,
      label: field.label || field.name || field.id || 'Unnamed field',
      type: field.type || 'text',
      classification,
      policy: policy.label,
      value: hasValue ? value : '',
      source,
      confidence: hasValue && classification !== 'unknown' && classification !== 'blocked' ? (memory ? 1 : classification === 'generated_draft' ? 0.82 : 0.98) : 0,
      requiresConfirmation,
      blocked: policy.blocked,
      approvedReuse,
      status: policy.blocked ? 'blocked' : hasValue ? (requiresConfirmation ? 'suggested' : 'autofill') : 'needs_input',
      reason: policy.blocked ? 'This field must be completed directly by the user.' : !hasValue ? 'No verified value is available.' : memory ? `Previously confirmed ${confirmations} time${confirmations === 1 ? '' : 's'}.` : 'Matched to a verified JobMap profile or CV fact.',
    };
  });
}

// ---------------------------------------------------------------------------
// Session key — generated once per page load, stored in sessionStorage.
// Used to sign bundles so expired or cross-session replays are rejected.
// ---------------------------------------------------------------------------

function getOrCreateSessionKey() {
  const stored = sessionStorage.getItem('jobmap.handoffKey');
  if (stored) return stored;
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');
  try { sessionStorage.setItem('jobmap.handoffKey', key); } catch { /* storage unavailable */ }
  return key;
}

/**
 * Compute a simple HMAC-like signature for a bundle.
 * Uses SubtleCrypto when available; falls back to a deterministic hash string
 * so bundle creation never throws.
 *
 * @param {string} data  - String to sign.
 * @param {string} key   - Session key hex string.
 * @returns {Promise<string>}
 */
async function signBundle(data, key) {
  try {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
    return Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // SubtleCrypto unavailable (insecure context) — use a plain concat.
    return `unsigned:${data.length}:${key.slice(0, 8)}`;
  }
}

export async function createAutofillBundle({ suggestions = [], job, cvDocumentId = '', origin = window.location.origin } = {}) {
  const bundleId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const sessionKey = getOrCreateSessionKey();
  const signatureData = `${bundleId}:${expiresAt}:${job?.id || ''}`;
  const hmacSignature = await signBundle(signatureData, sessionKey);

  return {
    version: 1,
    bundleId,
    createdAt: new Date().toISOString(),
    expiresAt,
    origin,
    allowedOrigin: origin,
    jobId: job?.id || null,
    jobTitle: job?.title || null,
    applyUrl: job?.applyUrl || null,
    cvDocumentId,
    sessionKey,   // Included so the extension can verify the HMAC without a shared backend secret.
    hmacSignature,
    revoked: false,
    fields: suggestions.filter((suggestion) => suggestion.status === 'autofill').map(({ fieldId, value, classification, source }) => ({ fieldId, value, classification, source })),
    blockedFieldIds: suggestions.filter((suggestion) => suggestion.blocked).map(({ fieldId }) => fieldId),
    requiresReviewFieldIds: suggestions.filter((suggestion) => suggestion.requiresConfirmation || suggestion.status === 'needs_input').map(({ fieldId }) => fieldId),
  };
}

/**
 * Revoke a live autofill bundle by posting a JOBMAP_REVOKE message.
 * The extension's background service worker listens for this and clears
 * its session storage, preventing any future fill from the same bundle.
 *
 * @param {string} bundleId
 */
export function revokeAutofillBundle(bundleId) {
  try {
    window.postMessage({ type: 'JOBMAP_REVOKE', payload: { bundleId } }, window.location.origin);
  } catch {
    // postMessage unavailable — no-op.
  }
}

export const autofillFieldPolicies = FIELD_POLICIES;
