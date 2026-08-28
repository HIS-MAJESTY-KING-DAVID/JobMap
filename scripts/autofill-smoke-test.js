import assert from 'node:assert/strict';
import { buildAutofillSuggestions, createAutofillBundle } from '../src/services/fieldAutofill.js';

const profile = {
  fullName: 'Kollo David',
  email: 'hismajestykingdavid@gmail.com',
  phone: '+237673147753',
  targetRole: 'IT Specialist',
  country: 'Cameroon',
  skills: 'Networking, systems administration',
  education: 'BSc Computer Engineering',
  gpa: '3.50',
  preferences: { employment: { requiresVisaSponsorship: false } },
};
const suggestions = buildAutofillSuggestions({
  fields: [
    { id: 'fullName', label: 'Full name' },
    { id: 'firstName', label: 'First name' },
    { id: 'lastName', label: 'Last name' },
    { id: 'email', label: 'Email address' },
    { id: 'phone', label: 'Phone number' },
    { id: 'targetRole', label: 'Target role' },
    { id: 'education', label: 'Education' },
    { id: 'gpa', label: 'GPA' },
    { id: 'sponsor', label: 'Will you require visa sponsorship?' },
    { id: 'attest', label: 'I certify that the information is accurate' },
    { id: 'captcha', label: 'CAPTCHA' },
    { id: 'mystery', label: 'Other question' },
  ],
  profile,
  learnedAnswers: {},
});
assert.equal(suggestions.find((item) => item.fieldId === 'fullName').value, 'Kollo David');
assert.equal(suggestions.find((item) => item.fieldId === 'firstName').value, 'Kollo');
assert.equal(suggestions.find((item) => item.fieldId === 'lastName').value, 'David');
assert.equal(suggestions.find((item) => item.fieldId === 'email').value, 'hismajestykingdavid@gmail.com');
assert.equal(suggestions.find((item) => item.fieldId === 'phone').value, '+237673147753');
assert.equal(suggestions.find((item) => item.fieldId === 'targetRole').value, 'IT Specialist');
assert.equal(suggestions.find((item) => item.fieldId === 'education').value, 'BSc Computer Engineering\nGPA: 3.50');
assert.equal(suggestions.find((item) => item.fieldId === 'gpa').value, '3.50');
assert.equal(suggestions.find((item) => item.fieldId === 'email').status, 'autofill');
assert.equal(suggestions.find((item) => item.fieldId === 'sponsor').requiresConfirmation, true);
assert.equal(suggestions.find((item) => item.fieldId === 'attest').blocked, true);
assert.equal(suggestions.find((item) => item.fieldId === 'captcha').blocked, true);
assert.equal(suggestions.find((item) => item.fieldId === 'mystery').status, 'blocked');
const bundle = createAutofillBundle({ suggestions, job: { id: 'job-1' }, cvDocumentId: 'cv-1', origin: 'https://jobmap-ten.vercel.app' });
assert.equal(bundle.fields.length, 8);
assert.deepEqual(bundle.blockedFieldIds, ['attest', 'captcha', 'mystery']);
assert.equal(bundle.fields.find((item) => item.fieldId === 'fullName').value, 'Kollo David');
assert.equal(bundle.fields.find((item) => item.fieldId === 'targetRole').value, 'IT Specialist');
assert.equal(bundle.origin, 'https://jobmap-ten.vercel.app');
assert.equal(bundle.cvDocumentId, 'cv-1');
console.log('ApplyFlow autofill smoke test passed.');
