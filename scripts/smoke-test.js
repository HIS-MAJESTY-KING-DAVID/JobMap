import assert from 'node:assert/strict';
import { cameroonLocations } from '../src/data/locations.js';
import { filterJobs } from '../src/services/JobService.js';
import { seedJobs } from '../src/services/seedJobs.js';

const allCameroon = cameroonLocations.find((location) => location.id === 'all');
const yaounde = cameroonLocations.find((location) => location.id === 'yaounde');
const douala = cameroonLocations.find((location) => location.id === 'douala');

assert.equal(filterJobs(seedJobs, { origin: allCameroon }).length, 5);
assert.equal(filterJobs(seedJobs, { query: 'software', origin: allCameroon }).length, 3);
assert.equal(filterJobs(seedJobs, { origin: yaounde, radiusKm: 50 }).length, 0);
assert.equal(filterJobs(seedJobs, { origin: douala, radiusKm: 10 }).length, 5);

console.log('JobMap smoke tests passed: nationwide view, search, city radius, and Douala radius behavior are valid.');
