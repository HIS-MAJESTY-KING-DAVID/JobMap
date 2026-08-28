/* global chrome */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'JOBMAP_GET_HANDOFF') {
    chrome.storage.session.get(['jobmapLastResult'], (result) => sendResponse(result));
    return true;
  }
  if (message?.type === 'JOBMAP_CLEAR_HANDOFF') {
    chrome.storage.session.remove(['jobmapLastBundle', 'jobmapLastResult'], () => sendResponse({ ok: true }));
    return true;
  }
});
