import assert from 'node:assert/strict';
import { buildAutofillSuggestions, createAutofillBundle } from '../src/services/fieldAutofill.js';

const profile = {
  fullName: 'Kollo David',
  email: 'hismajestykingdavid@gmail.com',
  phone: '+237673147753',
  targetRole: 'IT Specialist',
  country: 'Cameroon',
  skills: 'Networking, systems administration',
  preferences: { employment: { requiresVisaSponsorship: false } },
};
const suggestions = buildAutofillSuggestions({
  fields: [
    { id: 'email', label: 'Email address' },
    { id: 'sponsor', label: 'Will you require visa sponsorship?' },
    { id: 'attest', label: 'I certify that the information is accurate' },
    { id: 'captcha', label: 'CAPTCHA' },
    { id: 'mystery', label: 'Other question' },
  ],
  profile,
  learnedAnswers: {},
});
assert.equal(suggestions.find((item) => item.fieldId === 'email').status, 'autofill');
assert.equal(suggestions.find((item) => item.fieldId === 'sponsor').requiresConfirmation, true);
assert.equal(suggestions.find((item) => item.fieldId === 'attest').blocked, true);
assert.equal(suggestions.find((item) => item.fieldId === 'captcha').blocked, true);
assert.equal(suggestions.find((item) => item.fieldId === 'mystery').status, 'blocked');
const bundle = createAutofillBundle({ suggestions, job: { id: 'job-1' }, cvDocumentId: 'cv-1', origin: 'https://jobmap-ten.vercel.app' });
assert.equal(bundle.fields.length, 1);
assert.deepEqual(bundle.blockedFieldIds, ['attest', 'captcha', 'mystery']);
assert.equal(bundle.origin, 'https://jobmap-ten.vercel.app');
assert.equal(bundle.cvDocumentId, 'cv-1');
console.log('ApplyFlow autofill smoke test passed.');
