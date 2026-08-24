import assert from 'node:assert/strict';
import { cameroonLocations } from '../src/data/locations.js';
import { filterJobs } from '../src/services/JobService.js';
import { seedJobs } from '../src/services/seedJobs.js';

const allCameroon = cameroonLocations.find((location) => location.id === 'all');
const yaounde = cameroonLocations.find((location) => location.id === 'yaounde');
const douala = cameroonLocations.find((location) => location.id === 'douala');

assert.equal(filterJobs(seedJobs, { origin: allCameroon, mode: 'local' }).length, 4);
assert.equal(filterJobs(seedJobs, { query: 'software', origin: allCameroon, mode: 'local' }).length, 2);
assert.equal(filterJobs(seedJobs, { origin: allCameroon, mode: 'remote' }).length, 1);
assert.equal(filterJobs(seedJobs, { origin: yaounde, radiusKm: 50, mode: 'local' }).length, 0);
assert.equal(filterJobs(seedJobs, { origin: douala, radiusKm: 10, mode: 'local' }).length, 4);

console.log('JobMap smoke tests passed: local/remote modes, nationwide view, search, city radius, and Douala radius behavior are valid.');
