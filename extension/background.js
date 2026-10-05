/* global chrome */

/**
 * JobMap ApplyFlow Bridge — background.js v0.3.0
 *
 * Execution driver for the handoff loop:
 *
 *   JobMap SPA --postMessage--> capture.js --runtime--> this worker
 *     -> stores the bundle in session storage
 *     -> opens / focuses the employer applyUrl tab
 *     -> sends JOBMAP_FILL to the employer content script
 *   employer content script --runtime--> this worker
 *     -> relays JOBMAP_AUTOFILL_RESULT back to the JobMap tab (capture.js
 *        reposts it into the SPA window)
 *
 * Revocation clears the stored bundle and asks the employer tab to clear any
 * fill state, so a cancelled pack can never be replayed.
 */

const HANDOFF_TYPE = 'JOBMAP_AUTOFILL_HANDOFF';
const FILL_RESULT_TYPE = 'JOBMAP_FILL_RESULT';
const RESULT_TYPE = 'JOBMAP_AUTOFILL_RESULT';
const ACCEPTED_TYPE = 'JOBMAP_AUTOFILL_ACCEPTED';
const REVOKE_TYPE = 'JOBMAP_REVOKE';
const CLEAR_FILL_TYPE = 'JOBMAP_CLEAR_FILL';

const JOBMAP_ORIGINS = new Set([
  'https://jobmap-ten.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const FILL_WAIT_MS = 45_000;
// Aggregator listing pages resolve to the employer's real form; cap how many
// redirects we follow so a resolver loop can never bounce tabs forever.
const MAX_LANDING_HOPS = 3;

// The JobMap tab awaiting a receipt, the employer tab being filled, and every
// tab opened while following an apply-link chain (all cleared on revoke).
let relayTabId = null;
let fillTabId = null;
let fillChainTabIds = [];
let fillTimer = null;

function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve({ ok: true, response });
    });
  });
}

function originAllowed(sender) {
  if (sender?.origin && JOBMAP_ORIGINS.has(sender.origin)) return true;
  try {
    const url = new URL(sender?.url || '');
    return JOBMAP_ORIGINS.has(url.origin);
  } catch {
    return false;
  }
}

function finishFill(result) {
  if (fillTimer) { clearTimeout(fillTimer); fillTimer = null; }
  if (relayTabId != null) {
    sendToTab(relayTabId, { type: RESULT_TYPE, payload: result });
  }
  relayTabId = null;
  fillTabId = null;
}

function armFillTimer(bundleId) {
  if (fillTimer) clearTimeout(fillTimer);
  fillTimer = setTimeout(() => {
    finishFill({
      ok: false,
      bundleId,
      reason: 'The employer form did not answer. The extension may not be installed, or the page blocks automated filling.',
      failureReason: 'extension_unreachable',
    });
  }, FILL_WAIT_MS);
}

async function openEmployerTab(applyUrl) {
  try { new URL(applyUrl); } catch { return null; }
  const existing = await chrome.tabs.query({ url: applyUrl });
  if (existing?.length) {
    const tab = existing[0];
    if (tab.id != null) await chrome.tabs.update(tab.id, { active: true });
    return tab.id;
  }
  const created = await chrome.tabs.create({ url: applyUrl });
  return created.id;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    if (typeof chrome.tabs.onUpdated === 'undefined') { resolve(); return; }
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Safety net: if the tab was already complete, resolve shortly anyway.
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 8_000);
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['adapters.js', 'content.js'] });
    return true;
  } catch {
    return false;
  }
}

function isResolvedIntermediate(attempt) {
  return Boolean(attempt?.response?.result?.resolvedApplyUrl);
}

/**
 * The content script looked at an aggregator listing page and resolved the
 * employer's real application URL. Open it and deliver the fill there; the
 * destination may itself be a landing page, so recurse with a hop cap.
 */
async function followResolvedUrl(result, bundle, hop) {
  if (hop >= MAX_LANDING_HOPS) {
    finishFill({
      ok: false,
      bundleId: bundle.bundleId,
      reason: 'The apply link kept leading to listing pages instead of an employer form. Open the posting and apply from there — your pack is saved in JobMap.',
      failureReason: 'redirected_apply_link',
    });
    return true; // session ended with a typed receipt; no fallback needed
  }
  const nextTabId = await openEmployerTab(result.resolvedApplyUrl);
  if (nextTabId == null) {
    finishFill({
      ok: false,
      bundleId: bundle.bundleId,
      reason: 'JobMap found the application link but could not open it. Apply from the posting page directly — your pack is saved.',
      failureReason: 'network',
    });
    return true;
  }
  fillTabId = nextTabId;
  fillChainTabIds.push(nextTabId);
  await waitForTabComplete(nextTabId);
  armFillTimer(bundle.bundleId); // the chain may outlive the first 45s window
  return deliverFill(nextTabId, bundle, hop + 1);
}

async function deliverFill(tabId, bundle, hop = 0) {
  // 1. Direct message (content script already present).
  let attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
  if (attempt.ok) {
    if (isResolvedIntermediate(attempt)) return followResolvedUrl(attempt.response.result, bundle, hop);
    return true; // the content script answered; its own FILL_RESULT is the final relay
  }

  // 2. Inject the content scripts, then resend.
  if (await ensureContentScript(tabId)) {
    attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
    if (attempt.ok) {
      if (isResolvedIntermediate(attempt)) return followResolvedUrl(attempt.response.result, bundle, hop);
      return true;
    }
  }

  // 3. The tab predates the extension install — reload once and retry.
  try { await chrome.tabs.reload(tabId); } catch { /* tab closed */ }
  await waitForTabComplete(tabId);
  attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
  if (!attempt.ok) return false; // never reached: honest extension_unreachable
  if (isResolvedIntermediate(attempt)) return followResolvedUrl(attempt.response.result, bundle, hop);
  return true;
}

async function handleHandoff(payload, sender) {
  if (!originAllowed(sender)) {
    return { ok: false, reason: 'Handoff rejected: message did not come from an approved JobMap origin.' };
  }
  const bundle = payload || {};
  if (!bundle.bundleId || !bundle.jobId || !bundle.applyUrl || !Array.isArray(bundle.fields)) {
    return { ok: false, reason: 'Handoff rejected: bundle is missing required fields (bundleId, jobId, applyUrl, fields).' };
  }
  if (Date.parse(bundle.expiresAt || 0) <= Date.now()) {
    return { ok: false, reason: 'Handoff rejected: bundle has expired. Rebuild the pack in JobMap and try again.' };
  }

  relayTabId = sender.tab?.id ?? null;
  fillChainTabIds = [];
  await chrome.storage.session.set({
    jobmapLastBundle: {
      bundleId: bundle.bundleId,
      jobId: bundle.jobId,
      jobTitle: bundle.jobTitle || '',
      applyUrl: bundle.applyUrl,
      cvDocumentId: bundle.cvDocumentId || null,
      expiresAt: bundle.expiresAt,
    },
    jobmapLastResult: {
      bundleId: bundle.bundleId,
      at: new Date().toISOString(),
      state: 'pending',
      reason: 'Opening the employer form to fill approved safe fields.',
    },
  });

  let tabId;
  try {
    tabId = await openEmployerTab(bundle.applyUrl);
  } catch {
    finishFill({ ok: false, bundleId: bundle.bundleId, reason: 'Could not open the employer application page.', failureReason: 'network' });
    return { ok: false, reason: 'Could not open the employer application page.' };
  }
  fillTabId = tabId;
  fillChainTabIds.push(tabId);
  if (relayTabId != null) {
    sendToTab(relayTabId, {
      type: ACCEPTED_TYPE,
      payload: { bundleId: bundle.bundleId, reason: 'Employer form opened; filling approved safe fields.' },
    });
  }
  await waitForTabComplete(tabId);

  // Report a typed failure if the employer form never answers.
  armFillTimer(bundle.bundleId);

  const delivered = await deliverFill(tabId, bundle);
  if (!delivered && fillTimer) {
    // deliverFill already exercised injection + reload; report immediately.
    clearTimeout(fillTimer);
    fillTimer = null;
    finishFill({
      ok: false,
      bundleId: bundle.bundleId,
      reason: 'The employer form could not be reached. Fill it manually — your pack is saved in JobMap.',
      failureReason: 'extension_unreachable',
    });
  }
  return { ok: true, reason: 'Handoff accepted; employer form is being opened.' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === HANDOFF_TYPE) {
    handleHandoff(message.payload, sender)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, reason: 'Handoff failed unexpectedly.' }));
    return true; // async response
  }

  // Employer content script reporting the fill receipt. Intermediates
  // (landing-page redirects) travel via the fill call's sendResponse instead,
  // so anything arriving here is final and ends the session.
  if (message?.type === FILL_RESULT_TYPE) {
    const result = message.payload || {};
    const stored = { ...result, at: new Date().toISOString() };
    chrome.storage.session.set({ jobmapLastResult: stored }, () => {});
    finishFill(stored);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === 'JOBMAP_GET_HANDOFF') {
    chrome.storage.session.get(['jobmapLastBundle', 'jobmapLastResult'], (result) => sendResponse(result));
    return true;
  }
  if (message?.type === 'JOBMAP_CLEAR_HANDOFF') {
    chrome.storage.session.remove(['jobmapLastBundle', 'jobmapLastResult'], () => sendResponse({ ok: true }));
    return true;
  }

  // Revocation: JobMap signals that a live bundle should be invalidated.
  if (message?.type === REVOKE_TYPE) {
    chrome.storage.session.remove(['jobmapLastBundle', 'jobmapLastResult'], () => {
      sendResponse({ ok: true, revoked: message?.payload?.bundleId || true });
    });
    // Clear fill state on the whole chain: the landing tab we opened first
    // and every employer tab resolved from it.
    [...new Set([fillTabId, ...fillChainTabIds])] .filter((tabId) => tabId != null).forEach((tabId) => {
      sendToTab(tabId, { type: CLEAR_FILL_TYPE, payload: { bundleId: message?.payload?.bundleId || null } });
    });
    fillTabId = null;
    fillChainTabIds = [];
    return true;
  }
});
