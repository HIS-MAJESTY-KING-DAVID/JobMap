/* global chrome */

/**
 * JobMap ApplyFlow Bridge — content.js v0.3.0
 *
 * Runs only on allowlisted employer pages (Greenhouse boards, Stripe). It is
 * the *fill* half of the handoff. Security model is split:
 *
 *  - The JobMap origin that signed the bundle authenticates the message
 *    (bundle.origin must be an approved JobMap origin, and the HMAC must
 *    verify against the session key inside the bundle).
 *  - This page's host is the *fill allowlist*: nothing is written unless an
 *    adapter in adapters.js matches this page.
 *
 * Fill rules:
 *  - Only allowlisted safe fields (name, email, phone, LinkedIn, site, cover
 *    letter body) are ever written.
 *  - File inputs (the CV) are never touched — attaching the CV is a user
 *    action, by design. No CV bytes travel through messages.
 *  - CAPTCHA, login/MFA, payment, legal attestations, salary, sponsorship,
 *    work authorization, demographics, and unknown fields are all skipped and
 *    reported as rejected/blocked so the user fills them directly.
 *  - The result is a typed receipt: filled / skipped / rejectedFields /
 *    blockedRequired / needsUser / failureReason, sent back through the
 *    background worker to the JobMap tab.
 */

const SAFE_FIELDS = new Set(['fullName', 'firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote']);

const ALLOWED_JOBMAP_ORIGINS = new Set([
  'https://jobmap-ten.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const FILL_TYPE = 'JOBMAP_FILL';
const FILL_RESULT_TYPE = 'JOBMAP_FILL_RESULT';
const CLEAR_FILL_TYPE = 'JOBMAP_CLEAR_FILL';

let lastFilledBundleId = null;
let lastResult = null;

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

/**
 * Verify the bundle's HMAC signature against the session key included in the
 * payload. The key is not a server secret — it prevents cross-session replay
 * (the key changes each page load) but cannot stop extraction by a party with
 * access to sessionStorage. See README for the full threat model.
 */
async function verifyBundleSignature(bundle) {
  const { bundleId, expiresAt, jobId, sessionKey, hmacSignature } = bundle;
  if (!sessionKey || !hmacSignature) return false;
  try {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(sessionKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureData = `${bundleId}:${expiresAt}:${jobId || ''}`;
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(signatureData));
    const computed = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return computed === hmacSignature;
  } catch {
    return hmacSignature?.startsWith('unsigned:') ?? false;
  }
}

// ---------------------------------------------------------------------------
// Field detection
// ---------------------------------------------------------------------------

function labelFor(element) {
  if (element.labels?.[0]?.textContent) return element.labels[0].textContent;
  return element.getAttribute('aria-label') || element.getAttribute('name') || element.getAttribute('id') || element.getAttribute('placeholder') || '';
}

function genericFieldKey(label) {
  const value = String(label || '').toLowerCase();
  if (/full.?name|your name/.test(value) && !/first|last|surname/.test(value)) return 'fullName';
  if (/first.?name|given.?name/.test(value)) return 'firstName';
  if (/last.?name|surname|family.?name/.test(value)) return 'lastName';
  if (/email|e-mail/.test(value)) return 'email';
  if (/phone|mobile|telephone/.test(value)) return 'phone';
  if (/linkedin/.test(value)) return 'linkedin';
  if (/portfolio|personal site|website|your site/.test(value)) return 'portfolio';
  if (/cover letter|cover note|why do you want to work|why .*role|message to|motivation/.test(value)) return 'coverNote';
  return null;
}

function controlName(element) {
  return element.name || element.id || element.getAttribute('aria-label') || '';
}

function isVisible(element) {
  const rect = element.getClientRects?.();
  if (!rect || !rect.length) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function isSkippedType(element) {
  const type = (element.type || element.tagName || '').toLowerCase();
  return ['hidden', 'submit', 'button', 'reset', 'file', 'password', 'image'].includes(type)
    || ['checkbox', 'radio'].includes(type);
}

function isBlockedType(element) {
  const combined = `${controlName(element)} ${labelFor(element)}`.toLowerCase();
  return /(captcha|recaptcha|hcaptcha)/.test(combined)
    || /(password|passcode|otp|one time|two.factor|mfa)/.test(combined)
    || /(payment|card number|cvv)/.test(combined);
}

function isSensitiveType(element) {
  const combined = `${controlName(element)} ${labelFor(element)}`.toLowerCase();
  return /(authorized|authorization|sponsor|sponsorship|visa|work permit)/.test(combined)
    || /(salary|compensation|pay rate|hourly rate)/.test(combined)
    || /(ethnicity|race|gender|sex|disab|lgbtq|veteran|criminal|conviction)/.test(combined)
    || /(attest|certify|agree|terms|consent|accurate|truthful|signature|declare)/.test(combined);
}

function isRequired(element) {
  return Boolean(element.required)
    || element.getAttribute('aria-required') === 'true'
    || /\*|required/i.test(labelFor(element));
}

function pageShowsExpiredJob() {
  const text = (document.body?.innerText || '').toLowerCase();
  return /(no longer accepting|application is closed|this job is no longer|position has been filled)/.test(text);
}

// ---------------------------------------------------------------------------
// Fill engine
// ---------------------------------------------------------------------------

function setElementValue(element, value) {
  if (element.tagName === 'SELECT') {
    const normalized = String(value).trim().toLowerCase();
    const option = Array.from(element.options).find((opt) =>
      opt.value.trim().toLowerCase() === normalized || opt.text.trim().toLowerCase() === normalized);
    if (!option && element.options.length) return false;
    element.value = option ? option.value : element.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const setter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set;
  if (setter) setter.call(element, value); else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function highlight(element, kind) {
  try {
    if (kind === 'filled') {
      element.style.outline = '2px solid #2f9e6e';
      element.style.outlineOffset = '1px';
    } else if (kind === 'blocked') {
      element.style.outline = '2px solid #e8a33d';
      element.style.outlineOffset = '1px';
    }
  } catch {
    // Styling is cosmetic; never fail a fill because of it.
  }
}

async function fill(bundle) {
  // --- Split checks --------------------------------------------------------
  // The signing JobMap origin must be allowlisted (authenticates the message).
  if (!bundle || bundle.version !== 1 || !bundle.jobId || bundle.revoked === true
    || !ALLOWED_JOBMAP_ORIGINS.has(bundle.origin)
    || !Array.isArray(bundle.fields)
    || Date.parse(bundle.expiresAt || 0) <= Date.now()) {
    return {
      ok: false,
      bundleId: bundle?.bundleId || null,
      filled: 0,
      skipped: 0,
      rejectedFields: [],
      needsUser: true,
      reason: 'Bundle expired, revoked, invalid, or not signed by an approved JobMap origin.',
      failureReason: 'revoked',
    };
  }

  // This page's host must be on the fill allowlist (an adapter must match).
  const adapter = window.JobMapAdapters?.current?.() || null;
  if (!adapter) {
    return {
      ok: false,
      bundleId: bundle.bundleId,
      filled: 0,
      skipped: 0,
      rejectedFields: [],
      needsUser: true,
      reason: 'This employer page is not on the JobMap fill allowlist. No fields were touched.',
      failureReason: 'layout_change',
    };
  }

  const signatureValid = await verifyBundleSignature(bundle);
  if (!signatureValid) {
    return {
      ok: false,
      bundleId: bundle.bundleId,
      filled: 0,
      skipped: 0,
      rejectedFields: [],
      needsUser: true,
      reason: 'Bundle signature verification failed. The bundle may have been tampered with or replayed.',
      failureReason: 'revoked',
    };
  }

  if (pageShowsExpiredJob()) {
    return {
      ok: false,
      bundleId: bundle.bundleId,
      filled: 0,
      skipped: 0,
      rejectedFields: [],
      needsUser: true,
      reason: 'This job posting is no longer accepting applications.',
      failureReason: 'expired_job',
    };
  }

  // --- Live form scan ------------------------------------------------------
  const form = window.JobMapAdapters.describeForm();
  if (!form.hasForm) {
    return {
      ok: false,
      bundleId: bundle.bundleId,
      filled: 0,
      skipped: 0,
      rejectedFields: [],
      needsUser: true,
      reason: 'No application form was found on this page. The layout may have changed.',
      failureReason: 'layout_change',
    };
  }

  const approvedByKey = new Map(bundle.fields.filter((field) => SAFE_FIELDS.has(field.fieldId)).map((field) => [field.fieldId, field.value]));
  let filled = 0;
  let matched = 0;
  const rejectedFields = [];
  const blockedRequired = [];
  let sawCaptcha = false;
  let sawFile = false;
  let sawAuth = false;

  form.controls.forEach((element) => {
    if (isSkippedType(element) || !isVisible(element)) {
      if ((element.type || '').toLowerCase() === 'file') sawFile = true;
      return;
    }

    const key = window.JobMapAdapters.fieldKey(element) || genericFieldKey(labelFor(element));
    const required = isRequired(element);

    if (isBlockedType(element)) {
      sawCaptcha = sawCaptcha || /captcha/.test(`${controlName(element)} ${labelFor(element)}`.toLowerCase());
      sawAuth = sawAuth || /(password|otp|mfa|two.factor)/.test(`${controlName(element)} ${labelFor(element)}`.toLowerCase());
      rejectedFields.push({ name: controlName(element) || 'captcha', key: null, reason: 'blocked', required });
      if (required) blockedRequired.push({ name: controlName(element) || 'blocked', key: null, reason: 'blocked' });
      highlight(element, 'blocked');
      return;
    }
    if (isSensitiveType(element)) {
      rejectedFields.push({ name: controlName(element) || 'sensitive', key, reason: 'sensitive', required });
      if (required) blockedRequired.push({ name: controlName(element) || 'sensitive', key, reason: 'sensitive' });
      highlight(element, 'blocked');
      return;
    }

    if (key && SAFE_FIELDS.has(key)) {
      matched += 1;
      const value = approvedByKey.get(key);
      if (value) {
        const didSet = setElementValue(element, value);
        if (didSet) {
          filled += 1;
          highlight(element, 'filled');
        } else {
          rejectedFields.push({ name: controlName(element) || key, key, reason: 'no_matching_option', required });
          if (required) blockedRequired.push({ name: controlName(element) || key, key, reason: 'no_matching_option' });
        }
      } else {
        rejectedFields.push({ name: controlName(element) || key, key, reason: 'no_approved_value', required });
        if (required) blockedRequired.push({ name: controlName(element) || key, key, reason: 'no_approved_value' });
        highlight(element, 'blocked');
      }
      return;
    }

    // Everything else — unknown or unapproved question — stays user-controlled.
    rejectedFields.push({ name: controlName(element) || 'unknown-field', key, reason: 'unapproved_or_unknown', required });
    if (required) blockedRequired.push({ name: controlName(element) || 'unknown-field', key, reason: 'unapproved_or_unknown' });
    highlight(element, 'blocked');
  });

  const needsUser = blockedRequired.length > 0 || rejectedFields.length > 0 || sawCaptcha || sawFile;

  let failureReason = null;
  if (sawAuth) failureReason = 'auth';
  else if (sawCaptcha) failureReason = 'captcha';
  else if (blockedRequired.length > 0) failureReason = 'unexpected_field';
  else if (matched === 0 && rejectedFields.length === 0) failureReason = 'layout_change';

  const result = {
    ok: true,
    bundleId: bundle.bundleId,
    jobId: bundle.jobId,
    filled,
    skipped: Math.max(0, matched - filled),
    rejectedFields,
    blockedRequired,
    needsUser,
    sawCaptcha,
    sawFile,
    cv: { userAction: sawFile, cvDocumentId: bundle.cvDocumentId || null },
    failureReason,
    reason: needsUser
      ? `Filled ${filled} safe field${filled === 1 ? '' : 's'}; ${blockedRequired.length} required field${blockedRequired.length === 1 ? '' : 's'} and ${rejectedFields.length} other field${rejectedFields.length === 1 ? '' : 's'} remain for you to complete directly.`
      : `Filled ${filled} safe field${filled === 1 ? '' : 's'}. Review the form and submit it yourself.`,
  };

  lastFilledBundleId = bundle.bundleId;
  lastResult = result;
  chrome.storage.session.set({ jobmapLastResult: { ...result, at: new Date().toISOString() } }, () => {});
  return result;
}

// ---------------------------------------------------------------------------
// Message wiring — fill commands arrive from the background worker, receipts
// go back the same way (never cross-origin postMessage).
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === FILL_TYPE && message.payload) {
    const bundle = message.payload;
    if (lastFilledBundleId === bundle.bundleId && lastResult) {
      // Dedupe: the same bundle was already handled on this page.
      sendResponse({ ok: true, duplicate: true, result: lastResult });
      return;
    }
    fill(bundle).then((result) => {
      chrome.runtime.sendMessage({ type: FILL_RESULT_TYPE, payload: result }, () => {
        void chrome.runtime.lastError;
      });
      sendResponse({ ok: result.ok !== false, result });
    });
    return true; // async response
  }

  if (message?.type === CLEAR_FILL_TYPE) {
    lastFilledBundleId = null;
    lastResult = null;
    sendResponse({ ok: true });
  }
});