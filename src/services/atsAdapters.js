/**
 * atsAdapters.js
 * Direct ATS submission adapters for JobMap ApplyFlow.
 *
 * Safety contract:
 *  - Only safe profile/CV text fields are submitted programmatically.
 *  - CV file bytes are never sent from the browser; the user attaches the file
 *    manually on the employer confirmation page.
 *  - Sensitive, legal, CAPTCHA, and unknown fields always remain user-controlled.
 *  - "Submitted" is only ever recorded when the ATS returns a verifiable
 *    confirmation id. A 2xx without a receipt is a fallback, never Applied.
 *  - Every call returns a result object; it never throws to the caller.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GREENHOUSE_DOMAINS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
]);

export const STRIPE_GREENHOUSE_PATTERN = /^stripe\.com$/i;

export const GREENHOUSE_SAFE_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'linkedin_url', 'website', 'cover_letter_body'];

// ---------------------------------------------------------------------------
// Adapter detection
// ---------------------------------------------------------------------------

/**
 * Given an apply URL, returns the adapter key or null.
 * @param {string} applyUrl
 * @returns {'greenhouse' | 'stripe-greenhouse' | null}
 */
export function detectAdapter(applyUrl) {
  if (!applyUrl || applyUrl === '#') return null;
  try {
    const { hostname, pathname } = new URL(applyUrl);
    if (GREENHOUSE_DOMAINS.has(hostname)) return 'greenhouse';
    if (STRIPE_GREENHOUSE_PATTERN.test(hostname) && pathname.startsWith('/jobs/')) return 'stripe-greenhouse';
  } catch {
    // Malformed URL — no adapter.
  }
  return null;
}

// ---------------------------------------------------------------------------
// Greenhouse board ID extractor
// ---------------------------------------------------------------------------

/**
 * Extract the board token and job ID from a Greenhouse URL.
 * Handles:
 *   boards.greenhouse.io/BOARD/jobs/JOB_ID
 *   job-boards.greenhouse.io/BOARD/jobs/JOB_ID
 *   boards.greenhouse.io/embed/job_app?token=JOB_TOKEN&...
 *
 * @param {string} applyUrl
 * @returns {{ boardToken: string|null, jobId: string|null, token: string|null }}
 */
export function parseGreenhouseUrl(applyUrl) {
  try {
    const url = new URL(applyUrl);
    // Embed path: ?token=xxx
    const token = url.searchParams.get('token');
    if (token) return { boardToken: null, jobId: null, token };
    // Standard path: /BOARD/jobs/JOB_ID
    const parts = url.pathname.replace(/^\//, '').split('/');
    // parts[0] = board, parts[1] = 'jobs', parts[2] = jobId
    if (parts.length >= 3 && parts[1] === 'jobs') {
      return { boardToken: parts[0], jobId: parts[2], token: null };
    }
  } catch {
    // Swallow — return nulls below.
  }
  return { boardToken: null, jobId: null, token: null };
}

// ---------------------------------------------------------------------------
// Safe field builder
// ---------------------------------------------------------------------------

/**
 * Map JobMap pack + profile fields to Greenhouse field names.
 * Only safe, non-sensitive fields are included.
 *
 * @param {{ pack: object, profile: object }} param0
 * @returns {FormData}
 */
function buildGreenhouseFormData({ pack, profile }) {
  const fd = new FormData();

  const fullName = pack.fullName || profile.fullName || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const email = pack.email || profile.email || '';
  const phone = pack.phone || profile.phone || '';
  const linkedin = profile.linkedin || '';
  const portfolio = profile.portfolio || '';
  const coverNote = pack.coverNote || '';

  if (firstName) fd.append('first_name', firstName);
  if (lastName) fd.append('last_name', lastName);
  if (email) fd.append('email', email);
  if (phone) fd.append('phone', phone);
  if (linkedin) fd.append('linkedin_url', linkedin);
  if (portfolio) fd.append('website', portfolio);
  if (coverNote) fd.append('cover_letter_body', coverNote);

  return fd;
}

// ---------------------------------------------------------------------------
// Greenhouse submission (honest — verified receipt only)
// ---------------------------------------------------------------------------

/**
 * Attempt to submit safe text fields directly to the Greenhouse public API.
 *
 * "Submitted" is only returned when the API answers with a real confirmation
 * id (`json.id`). A plain 2xx without a receipt, a CORS failure, or any other
 * error returns an open-fallback result — ApplyFlow then opens the employer
 * page and never records the application as submitted until the user confirms.
 *
 * @param {{ applyUrl: string, pack: object, profile: object }} options
 * @returns {Promise<{
 *   success: boolean,
 *   method: 'api' | 'open-fallback',
 *   receiptUrl: string|null,
 *   confirmationId: string|null,
 *   fieldsSubmitted: string[],
 *   reason: string,
 * }>}
 */
export async function submitGreenhouseApplication({ applyUrl, pack, profile }) {
  const { boardToken, jobId } = parseGreenhouseUrl(applyUrl);

  // If we can't extract board + job, fall back to manual open.
  if (!boardToken || !jobId) {
    return {
      success: false,
      method: 'open-fallback',
      receiptUrl: applyUrl,
      confirmationId: null,
      fieldsSubmitted: [],
      reason: 'Greenhouse board or job ID could not be extracted from the apply URL. Opening the employer page for manual completion.',
    };
  }

  const fd = buildGreenhouseFormData({ pack, profile });
  const endpoint = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}/applications`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' },
      // No Authorization header — Greenhouse public apply endpoints are unauthenticated.
    });

    let body = null;
    try { body = await response.json(); } catch { /* non-JSON body */ }

    if (response.ok) {
      const confirmationId = body?.id ? String(body.id) : null;
      if (confirmationId) {
        return {
          success: true,
          method: 'api',
          receiptUrl: applyUrl,
          confirmationId,
          fieldsSubmitted: GREENHOUSE_SAFE_FIELDS,
          reason: 'Greenhouse returned a confirmation id. Attach your CV on the confirmation page and verify the receipt in your tracker.',
        };
      }
      // 2xx but no verifiable receipt — do not claim submitted.
      return {
        success: false,
        method: 'open-fallback',
        receiptUrl: applyUrl,
        confirmationId: null,
        fieldsSubmitted: [],
        reason: 'Greenhouse accepted the request but returned no confirmation id. Not recording this as submitted — open the page and confirm before you do.',
      };
    }

    // 4xx / 5xx — open fallback with the API's own message when available.
    const apiMessage = body?.message || body?.error || `Greenhouse returned ${response.status}`;
    return {
      success: false,
      method: 'open-fallback',
      receiptUrl: applyUrl,
      confirmationId: null,
      fieldsSubmitted: [],
      reason: `${apiMessage}. Opening the employer page; your pack details are still available.`,
    };
  } catch {
    // CORS, network offline, or DNS failure.
    return {
      success: false,
      method: 'open-fallback',
      receiptUrl: applyUrl,
      confirmationId: null,
      fieldsSubmitted: [],
      reason: 'Could not reach the Greenhouse API from the browser (likely CORS or network). Opening the employer page for manual completion.',
    };
  }
}

// ---------------------------------------------------------------------------
// Greenhouse question ingest (P1 — pack matches the real form)
// ---------------------------------------------------------------------------

const QUESTION_TEXT_TYPES = new Set(['input_text', 'textarea', 'multi_line_text']);
const QUESTION_SELECT_TYPES = new Set(['select', 'multi_select']);

/**
 * Flatten a Greenhouse job `questions` payload into a stable list of question
 * records. Pure function so it can be unit-tested without the network.
 *
 * @param {Array} questions - Greenhouse job payload `questions` array.
 * @returns {Array<{ key, label, type, required, options }>}
 */
export function normalizeGreenhouseQuestions(questions = []) {
  const flat = [];

  const visit = (question, parentKey = '', parentLabel = '') => {
    const key = question.name || question.label || question.id || 'question';
    const label = question.label || key;
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    const fullLabel = parentLabel ? `${parentLabel} → ${label}` : label;
    if (Array.isArray(question.fields) && question.fields.length) {
      question.fields.forEach((child) => visit(child, fullKey, fullLabel));
      return;
    }
    flat.push({
      key: fullKey,
      label: fullLabel,
      type: question.type || 'unknown',
      required: Boolean(question.required),
      options: Array.isArray(question.options)
        ? question.options.map((option) => (typeof option === 'string' ? { label: option, value: option } : { label: option.label || option.value, value: option.value ?? option.label }))
        : [],
    });
  };

  questions.forEach((question) => visit(question));
  return flat;
}

/**
 * Fetch the questions on a Greenhouse job's apply form and normalize them.
 * Works only for standard Greenhouse boards (`boards.greenhouse.io`).
 *
 * @param {string} applyUrl
 * @returns {Promise<Array>} normalized questions; [] on any failure.
 */
export async function fetchGreenhouseQuestions(applyUrl) {
  const { boardToken, jobId } = parseGreenhouseUrl(applyUrl);
  if (!boardToken || !jobId) return [];
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return normalizeGreenhouseQuestions(payload.questions);
  } catch {
    return [];
  }
}

export const questionTypeLabels = {
  input_text: 'Short text',
  multi_line_text: 'Long text',
  textarea: 'Long text',
  select: 'Single choice',
  multi_select: 'Multiple choice',
  file: 'File upload (CV)',
  boolean: 'Yes / No',
  date: 'Date',
  currency: 'Currency',
  unknown: 'Question',
};