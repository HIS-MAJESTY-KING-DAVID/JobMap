import assert from 'node:assert/strict';

// Node has no sessionStorage; the bundle session key lives there in the browser.
globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };

import { normalizeGreenhouseQuestions, parseGreenhouseUrl, detectAdapter } from '../src/services/atsAdapters.js';
import { getCapabilityDetail, capabilityLabels } from '../src/services/capabilityRegistry.js';
import { buildAutofillSuggestions, createAutofillBundle } from '../src/services/fieldAutofill.js';
import { getExtensionOutcome } from '../src/services/applicationExecution.js';

// --- Greenhouse URL parsing -------------------------------------------------
assert.deepEqual(parseGreenhouseUrl('https://boards.greenhouse.io/example/jobs/7654321'), { boardToken: 'example', jobId: '7654321', token: null });
assert.deepEqual(parseGreenhouseUrl('https://boards.greenhouse.io/embed/job_app?token=abc123'), { boardToken: null, jobId: null, token: 'abc123' });
assert.equal(detectAdapter('https://boards.greenhouse.io/example/jobs/1'), 'greenhouse');
assert.equal(detectAdapter('https://stripe.com/jobs/engineering/123'), 'stripe-greenhouse');
assert.equal(detectAdapter('https://jobs.lever.co/foo/bar'), 'lever');
assert.equal(detectAdapter('https://jobs.ashbyhq.com/litellm/3f326076-7415-46a1-921e-8a1b1d6ee2b6/application'), 'ashby');
assert.equal(detectAdapter('https://jobicy.com/jobs/147864-example'), null); // landing pages are capability-registry territory

// --- Question ingest normalization (pure, no network) -----------------------
const questions = normalizeGreenhouseQuestions([
  { name: 'first_name', label: 'First Name', type: 'input_text', required: true },
  { name: 'last_name', label: 'Last Name', type: 'input_text', required: true },
  { name: 'resume', label: 'Resume/CV', type: 'file', required: true },
  { name: 'location', label: 'Location', type: 'select', required: false, options: [{ label: 'Yaoundé', value: 'yaounde' }, { label: 'Douala', value: 'douala' }] },
  { name: 'custom', label: 'Custom group', type: 'group', fields: [{ name: 'nested', label: 'Nested question', type: 'boolean', required: false }] },
]);
assert.equal(questions.length, 5);
assert.equal(questions[0].key, 'first_name');
assert.equal(questions[0].required, true);
assert.equal(questions[3].options.length, 2);
assert.equal(questions[3].options[1].value, 'douala');
// Nested questions flatten with a parent key so answers stay per-question.
assert.equal(questions[4].key, 'custom.nested');
assert.equal(questions[4].type, 'boolean');
assert.ok(questions.every((question) => question.key && question.label && question.type));

// --- Capability registry ----------------------------------------------------
const greenhouseJob = { id: 'job-1', title: 'Engineer', applyUrl: 'https://boards.greenhouse.io/example/jobs/7654321', applicationCapability: 'extension' };
const detail = getCapabilityDetail(greenhouseJob);
assert.equal(detail.capability, 'extension');
assert.equal(detail.key, 'greenhouse');
assert.ok(detail.supportedFields.includes('coverNote'));
assert.ok(capabilityLabels[detail.capability]);

// A job claiming `api` without a registry entry is downgraded to manual (honest labeling).
const liarJob = { id: 'job-2', applyUrl: 'https://some-other-board.example/jobs/1', applicationCapability: 'api' };
assert.equal(getCapabilityDetail(liarJob).capability, 'manual');

// Manual fallback for unknown sources.
assert.equal(getCapabilityDetail({ id: 'job-3', applyUrl: '#' }).capability, 'manual');

// Landing pages from aggregator sources resolve via the bridge's link resolver.
assert.equal(getCapabilityDetail({ id: 'job-4', applyUrl: 'https://jobicy.com/jobs/147864-senior-sales-executive' }).key, 'aggregator-landing');
assert.equal(getCapabilityDetail({ id: 'job-5', applyUrl: 'https://remotive.com/remote-jobs/all-others/x-2091105' }).key, 'aggregator-landing');
assert.equal(getCapabilityDetail({ id: 'job-6', applyUrl: 'https://reliefweb.int/job/4226284/conservation-pilot' }).key, 'aggregator-landing');
assert.equal(getCapabilityDetail({ id: 'job-6b', applyUrl: 'https://news.ycombinator.com/item?id=45000000' }).key, 'aggregator-landing'); // HN jobs land on news.ycombinator.com
assert.equal(getCapabilityDetail({ id: 'job-7', applyUrl: 'https://emploi.fnecm.org/offre/C01-OE-2026-001737' }).capability, 'manual'); // FNE hosts no form

// Lever and Ashby are registry entries with extension capability.
assert.equal(getCapabilityDetail({ id: 'job-8', applyUrl: 'https://jobs.lever.co/faithlife/123' }).capability, 'extension');
assert.equal(getCapabilityDetail({ id: 'job-9', applyUrl: 'https://jobs.ashbyhq.com/litellm/3f326076/application' }).capability, 'extension');

// --- Bundle carries applyUrl for the background worker ----------------------
const profile = { fullName: 'Kollo David', email: 'hismajestykingdavid@gmail.com', phone: '+237673147753', targetRole: 'IT Specialist' };
const suggestions = buildAutofillSuggestions({
  fields: [
    { id: 'fullName', label: 'Full name' },
    { id: 'email', label: 'Email address' },
    { id: 'phone', label: 'Phone number' },
  ],
  profile,
  learnedAnswers: {},
});
const bundle = await createAutofillBundle({ suggestions, job: greenhouseJob, cvDocumentId: 'cv-1', origin: 'https://jobmap-ten.vercel.app' });
assert.equal(bundle.applyUrl, greenhouseJob.applyUrl);
assert.equal(bundle.fields.length, 3);
assert.equal(bundle.fields.find((field) => field.fieldId === 'email').value, profile.email);
assert.equal(bundle.origin, 'https://jobmap-ten.vercel.app');

// A CAPTCHA or unapproved required question is a safe user-action pause, not
// a failed application. A missing form falls back to manual completion.
assert.equal(getExtensionOutcome({ ok: true, needsUser: true, failureReason: 'captcha', filled: 4 }).status, 'needs_user');
assert.equal(getExtensionOutcome({ ok: true, needsUser: true, failureReason: 'unexpected_field', filled: 4 }).executionState, 'extension_filled');
assert.equal(getExtensionOutcome({ ok: false, failureReason: 'layout_change' }).status, 'manual_fallback');
assert.equal(getExtensionOutcome({ ok: false, failureReason: 'expired_job' }).status, 'failed');
assert.equal(getExtensionOutcome({ ok: false, failureReason: 'revoked' }).status, 'cancelled');

console.log('ApplyFlow bridge smoke test passed: URL parsing, question ingest, capability registry, bundle handoff shape, and receipt states are valid.');
