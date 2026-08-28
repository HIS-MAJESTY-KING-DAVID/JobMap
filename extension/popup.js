/* global chrome */

const status = document.querySelector('#status');
chrome.runtime.sendMessage({ type: 'JOBMAP_GET_HANDOFF' }, (result) => {
  const item = result?.jobmapLastResult;
  if (!item) return;
  status.textContent = `${item.filled} safe field${item.filled === 1 ? '' : 's'} filled at ${new Date(item.at).toLocaleTimeString()}. ${item.skipped} field${item.skipped === 1 ? '' : 's'} remain paused.`;
});
document.querySelector('#clear').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'JOBMAP_CLEAR_HANDOFF' }, () => { status.textContent = 'Handoff cleared.'; });
});
