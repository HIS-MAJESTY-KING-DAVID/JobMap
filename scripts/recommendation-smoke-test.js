import assert from 'node:assert/strict';
import { getEligibilitySummary, getFitScore } from '../src/services/recommendations.js';

const profile = { targetRole: 'Software Engineer', skills: 'JavaScript, React', country: 'Cameroon' };
const eligibleJob = { title: 'Software Engineer', description: 'Remote React role worldwide', remoteEligibility: 'worldwide', sourceTrust: 'public-api', workMode: 'Remote' };
const restrictedJob = { title: 'Software Engineer', description: 'Remote role for US residents only', remoteEligibility: 'restricted', workMode: 'Remote' };

assert.equal(getEligibilitySummary(eligibleJob, 'remote').key, 'eligible');
assert.equal(getEligibilitySummary(restrictedJob, 'remote').key, 'restricted');
assert.ok(getFitScore(eligibleJob, profile, 'remote').score > getFitScore(restrictedJob, profile, 'remote').score);
assert.ok(getFitScore(eligibleJob, profile, 'remote').matchedTerms.includes('react'));

console.log('Recommendation smoke tests passed: fit scoring, Cameroon/worldwide eligibility, and restricted-role safeguards are valid.');
