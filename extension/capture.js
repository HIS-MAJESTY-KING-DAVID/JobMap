/* global chrome */

/**
 * JobMap ApplyFlow Bridge — capture.js v0.3.0
 *
 * Runs only on approved JobMap origins. Its job is the last mile of the
 * handoff loop:
 *
 *   1. Captures the JOBMAP_AUTOFILL_HANDOFF postMessage the SPA posts to its
 *      own window and forwards it to the background service worker.
 *   2. Captures JOBMAP_REVOKE so a cancelled bundle is invalidated everywhere.
 *   3. Relays JOBMAP_AUTOFILL_RESULT receipts relayed back from the employer
 *      tab into the SPA's own window so ApplyFlow can write the fill receipt.
 *
 * The message is authenticated by the background worker against the approved
 * JobMap origins before any employer tab is touched.
 */

const HANDOFF_TYPE = 'JOBMAP_AUTOFILL_HANDOFF';
const REVOKE_TYPE = 'JOBMAP_REVOKE';
const RESULT_TYPE = 'JOBMAP_AUTOFILL_RESULT';

function postToPage(type, payload) {
  try {
    window.postMessage({ type, payload }, window.location.origin);
  } catch {
    // postMessage unavailable — nothing else to do.
  }
}

// SPA -> background: handoff / revocation.
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.type === HANDOFF_TYPE && event.data.payload) {
    chrome.runtime.sendMessage({ type: HANDOFF_TYPE, payload: event.data.payload }, () => {
      // Suppress "message port closed" noise when the worker is restarting.
      void chrome.runtime.lastError;
    });
    return;
  }
  if (event.data?.type === REVOKE_TYPE) {
    chrome.runtime.sendMessage({ type: REVOKE_TYPE, payload: event.data.payload || {} }, () => {
      void chrome.runtime.lastError;
    });
  }
});

// Background -> SPA: fill receipts relayed from the employer tab.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === RESULT_TYPE && message.payload) {
    postToPage(RESULT_TYPE, message.payload);
  }
});