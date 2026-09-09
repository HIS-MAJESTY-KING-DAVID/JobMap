/* global chrome */

const status = document.querySelector('#status');
const detail = document.querySelector('#detail');
const clear = document.querySelector('#clear');

function render(item, bundle) {
  if (!item) {
    status.textContent = 'No recent handoff.';
    detail.textContent = 'Open a job in JobMap, save an approved pack, and choose “Send to extension”.';
    clear.hidden = true;
    return;
  }
  if (item.state === 'pending') {
    status.textContent = `Opening ${bundle?.jobTitle || 'the employer form'}…`;
    detail.textContent = 'Safe fields will be filled only on an allowlisted employer page.';
    clear.hidden = false;
    return;
  }
  if (item.ok === false) {
    status.textContent = 'Handoff could not fill the form.';
    detail.textContent = `${item.reason || 'See JobMap for details.'}${item.failureReason ? ` (${item.failureReason.replaceAll('_', ' ')})` : ''}`;
    clear.hidden = false;
    return;
  }
  const filledText = `${item.filled} safe field${item.filled === 1 ? '' : 's'} filled at ${new Date(item.at || Date.now()).toLocaleTimeString()}.`;
  const pausedText = item.blockedRequired?.length
    ? ` ${item.blockedRequired.length} required field${item.blockedRequired.length === 1 ? '' : 's'} need your input.`
    : ` ${item.skipped} field${item.skipped === 1 ? '' : 's'} remain paused.`;
  status.textContent = filledText + pausedText;
  const cvHint = item.cv?.userAction === false
    ? ''
    : (bundle?.cvDocumentId ? ' Attach your approved CV on the form — JobMap never uploads it.' : ' Attach your CV yourself — JobMap never uploads files.');
  detail.textContent = (item.reason || 'Review the form and submit it yourself.') + cvHint;
  clear.hidden = false;
}

chrome.runtime.sendMessage({ type: 'JOBMAP_GET_HANDOFF' }, (result) => {
  render(result?.jobmapLastResult, result?.jobmapLastBundle);
});

clear.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'JOBMAP_CLEAR_HANDOFF' }, () => { status.textContent = 'Handoff cleared.'; detail.textContent = ''; });
});