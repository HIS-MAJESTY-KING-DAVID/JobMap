/* global chrome */

const SAFE_FIELDS = new Set(['fullName', 'firstName', 'lastName', 'email', 'phone', 'targetRole', 'skills', 'linkedin', 'portfolio']);
const HANDOFF_TYPE = 'JOBMAP_AUTOFILL_HANDOFF';

function isAllowedJobMapMessage(event) {
  if (event.source !== window || !event.data || event.data.type !== HANDOFF_TYPE) return false;
  const payload = event.data.payload || {};
  const allowedOrigin = event.origin === 'https://jobmap-ten.vercel.app' || event.origin === 'http://localhost:3000' || event.origin === 'http://localhost:5173';
  return allowedOrigin && payload.allowedOrigin === event.origin && payload.origin === event.origin && Boolean(payload.jobId) && Array.isArray(payload.fields);
}

function labelFor(element) {
  if (element.labels?.[0]?.textContent) return element.labels[0].textContent;
  return element.getAttribute('aria-label') || element.getAttribute('name') || element.getAttribute('id') || element.getAttribute('placeholder') || '';
}

function fieldKey(label) {
  const value = label.toLowerCase();
  if (/full.?name|your name|name/.test(value) && !/first|last|surname/.test(value)) return 'fullName';
  if (/email|e-mail/.test(value)) return 'email';
  if (/phone|mobile|telephone/.test(value)) return 'phone';
  if (/target role|job title|position|desired role/.test(value)) return 'targetRole';
  if (/skill|technology|competenc/.test(value)) return 'skills';
  if (/linkedin/.test(value)) return 'linkedin';
  if (/portfolio|website|personal site/.test(value)) return 'portfolio';
  return null;
}

function fill(bundle) {
  if (!bundle || bundle.version !== 1 || !bundle.jobId || bundle.origin !== window.location.origin || bundle.allowedOrigin !== window.location.origin || !Array.isArray(bundle.fields) || Date.parse(bundle.expiresAt || 0) <= Date.now()) return { filled: 0, skipped: bundle?.requiresReviewFieldIds?.length || 0, reason: 'Bundle expired, invalid, or not bound to this JobMap session.' };
  let filled = 0;
  document.querySelectorAll('input, textarea, select').forEach((element) => {
    const key = window.JobMapAdapters?.fieldKey(element) || fieldKey(labelFor(element));
    const approved = bundle.fields.find((field) => field.fieldId === key && SAFE_FIELDS.has(field.fieldId));
    if (!approved || !approved.value) return;
    const setter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set;
    if (setter) setter.call(element, approved.value); else element.value = approved.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    filled += 1;
  });
  return { filled, skipped: bundle.requiresReviewFieldIds?.length || 0, reason: 'Only allowlisted safe fields were considered.' };
}

window.addEventListener('message', (event) => {
  if (!isAllowedJobMapMessage(event)) return;
  const result = fill(event.data.payload);
  chrome.storage.session.set({ jobmapLastBundle: { jobTitle: event.data.payload.jobTitle || '', expiresAt: event.data.payload.expiresAt, origin: event.origin }, jobmapLastResult: { ...result, at: new Date().toISOString() } });
  window.postMessage({ type: 'JOBMAP_AUTOFILL_RESULT', payload: result }, event.origin);
});
