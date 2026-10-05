import assert from 'node:assert/strict';

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  },
};

const { getApplications, saveApplication } = await import('../src/services/storage.js');

const application = {
  id: 'application-1',
  jobId: 'job-1',
  job: { title: 'Engineer' },
  status: 'queued',
  events: [{ id: 'queued-event', type: 'queued_for_extension', createdAt: '2026-10-05T00:00:00.000Z' }],
};

saveApplication(application);
saveApplication({
  ...application,
  status: 'filling',
  events: [{ id: 'filling-event', type: 'extension_filling', createdAt: '2026-10-05T00:01:00.000Z' }],
});
saveApplication({
  ...application,
  status: 'needs_user',
  events: [{ id: 'paused-event', type: 'extension_paused', createdAt: '2026-10-05T00:02:00.000Z' }],
});

const [saved] = getApplications();
assert.equal(saved.status, 'needs_user');
assert.deepEqual(saved.events.map((event) => event.type).filter((type) => type !== 'pack_saved'), [
  'queued_for_extension',
  'extension_filling',
  'extension_paused',
]);

console.log('Application storage smoke test passed: execution timeline is preserved across saves.');
