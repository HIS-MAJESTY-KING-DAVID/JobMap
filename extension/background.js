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
const REVOKE_TYPE = 'JOBMAP_REVOKE';
const CLEAR_FILL_TYPE = 'JOBMAP_CLEAR_FILL';

const JOBMAP_ORIGINS = new Set([
  'https://jobmap-ten.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const FILL_WAIT_MS = 45_000;

// The JobMap tab awaiting a receipt, and the employer tab being filled.
let relayTabId = null;
let fillTabId = null;
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

async function openEmployerTab(applyUrl) {
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

async function deliverFill(tabId, bundle) {
  // 1. Direct message (content script already present).
  let attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
  if (attempt.ok && attempt.response?.ok !== false) return true;

  // 2. Inject the content scripts, then resend.
  const injected = await ensureContentScript(tabId);
  if (injected) {
    attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
    if (attempt.ok && attempt.response?.ok !== false) return true;
  }

  // 3. The tab predates the extension install — reload once and retry.
  try { await chrome.tabs.reload(tabId); } catch { /* tab closed */ }
  await waitForTabComplete(tabId);
  attempt = await sendToTab(tabId, { type: 'JOBMAP_FILL', payload: bundle });
  return attempt.ok && attempt.response?.ok !== false;
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
  await waitForTabComplete(tabId);

  // Report a typed failure if the employer form never answers.
  if (fillTimer) clearTimeout(fillTimer);
  fillTimer = setTimeout(() => {
    finishFill({
      ok: false,
      bundleId: bundle.bundleId,
      reason: 'The employer form did not answer. The extension may not be installed, or the page blocks automated filling.',
      failureReason: 'extension_unreachable',
    });
  }, FILL_WAIT_MS);

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

  // Employer content script reporting the fill receipt.
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
    if (fillTabId != null) {
      sendToTab(fillTabId, { type: CLEAR_FILL_TYPE, payload: { bundleId: message?.payload?.bundleId || null } });
      fillTabId = null;
    }
    return true;
  }
});