/**
 * swipeQueue.js
 * Profile-weighted, session-deduplicating swipe queue for the Global Remote tab.
 *
 * Ordering:
 *  1. Jobs matching profile.targetRole words → highest score tier.
 *  2. Jobs matching profile.skills terms → medium score.
 *  3. Cameroon-eligible → bonus.
 *  4. Africa-eligible / worldwide → smaller bonus.
 *  5. Fisher-Yates shuffle applied within each score tier so repeated sessions
 *     feel different even when preferences haven't changed.
 *
 * Seen-card persistence:
 *  - Seen job IDs are stored in localStorage (capped at 500).
 *  - Cards are excluded from the queue once seen within the same session.
 *  - `resetSwipeSeen()` clears the set so the user can start fresh.
 */

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const SWIPE_SEEN_KEY = 'jobmap.swipeSeen.v1';
const MAX_SEEN = 500;

/** @returns {Set<string>} */
export function getSwipeSeen() {
  try {
    const raw = localStorage.getItem(SWIPE_SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/** @param {string} jobId */
export function markSwipeSeen(jobId) {
  const seen = getSwipeSeen();
  seen.add(jobId);
  const capped = [...seen].slice(-MAX_SEEN);
  try {
    localStorage.setItem(SWIPE_SEEN_KEY, JSON.stringify(capped));
  } catch {
    // Storage unavailable — no-op.
  }
}

/** Clears the seen set so the user gets a fresh queue. */
export function resetSwipeSeen() {
  try {
    localStorage.removeItem(SWIPE_SEEN_KEY);
  } catch {
    // Storage unavailable — no-op.
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const REMOTE_TERMS = /remote|worldwide|distributed|work from anywhere/i;

/**
 * Parse a profile field value into individual lowercased terms.
 * @param {string|string[]|undefined} value
 * @returns {string[]}
 */
function parseTerms(value) {
  const text = Array.isArray(value) ? value.join(' ') : String(value || '');
  return text
    .split(/[,;|\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2);
}

/**
 * Score a job relative to a profile.
 * Returns a numeric score ≥ 0; higher → show earlier.
 *
 * @param {object} job
 * @param {object} profile
 * @returns {number}
 */
function scoreJob(job, profile) {
  const jobText = [job.title, job.company, job.description, job.location, ...(job.tags || [])].join(' ').toLowerCase();
  let score = 0;

  // Target role match — strongest signal.
  const roleTerms = parseTerms(profile?.targetRole);
  if (roleTerms.some((term) => jobText.includes(term))) score += 40;

  // Skills match.
  const skillTerms = parseTerms(profile?.skills);
  const matchedSkills = skillTerms.filter((term) => jobText.includes(term));
  score += Math.min(30, matchedSkills.length * 8);

  // Eligibility bonuses.
  const eligibility = String(job.remoteEligibility || '').toLowerCase();
  if (eligibility === 'cameroon-eligible') score += 20;
  else if (eligibility === 'africa-eligible') score += 12;
  else if (eligibility === 'worldwide' || REMOTE_TERMS.test(jobText)) score += 6;

  // Source trust bonus.
  if (['public-api', 'public-feed', 'verified'].includes(job.sourceTrust)) score += 4;

  return score;
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (in-place)
// ---------------------------------------------------------------------------

/**
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ---------------------------------------------------------------------------
// Queue builder
// ---------------------------------------------------------------------------

/**
 * Build a profile-weighted, deduplication-aware swipe queue.
 *
 * @param {object[]} jobs            - Full filtered jobs list (remote mode).
 * @param {object}   profile         - Current user profile.
 * @param {boolean}  eligibleOnly    - When true, exclude jobs with `unclear` or `restricted` eligibility.
 * @param {Set<string>} [seenIds]    - Optional override; defaults to persisted seen set.
 * @returns {object[]}               - Ordered job list ready for display.
 */
export function buildSwipeQueue(jobs, profile = {}, eligibleOnly = false, seenIds) {
  const seen = seenIds !== undefined ? seenIds : getSwipeSeen();

  // Filter out already-seen cards.
  let candidates = jobs.filter((job) => !seen.has(job.id));

  // Apply eligibility gate when strict filter is on.
  if (eligibleOnly) {
    candidates = candidates.filter((job) => {
      const e = String(job.remoteEligibility || '').toLowerCase();
      return e === 'cameroon-eligible' || e === 'africa-eligible' || e === 'worldwide';
    });
  }

  // Score every candidate.
  const scored = candidates.map((job) => ({ job, score: scoreJob(job, profile) }));

  // Group by score tier (10-point buckets) so shuffle is meaningful.
  const tiers = new Map();
  scored.forEach(({ job, score }) => {
    const tier = Math.floor(score / 10);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier).push(job);
  });

  // Sort tiers descending, shuffle within each tier.
  const sorted = [...tiers.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, tierJobs]) => shuffle(tierJobs));

  return sorted;
}
