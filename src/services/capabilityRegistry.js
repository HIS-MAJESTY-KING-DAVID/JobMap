/**
 * capabilityRegistry.js
 * Per-job execution capability, as data — shown before the user builds a pack.
 *
 * A job is labeled `api` only when an adapter path has returned a verifiable
 * confirmation receipt in tests. Everything else is `extension` (browser
 * bridge on an allowlisted host), `manual` (honest fallback), or
 * `unsupported` (no verified route yet).
 */

import { detectAdapter } from './atsAdapters.js';

/**
 * Registry of verified adapter routes. `health` reflects the last verified
 * status, not aspirational support.
 */
export const CAPABILITY_REGISTRY = [
  {
    key: 'greenhouse',
    capability: 'extension',
    domains: ['boards.greenhouse.io', 'job-boards.greenhouse.io'],
    label: 'Greenhouse',
    supportedFields: ['fullName', 'firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'beta',
    note: 'Browser bridge fills safe fields and pauses on required, sensitive, and unknown questions. You attach the CV and submit.',
  },
  {
    key: 'stripe-greenhouse',
    capability: 'extension',
    domains: ['stripe.com'],
    label: 'Stripe (Greenhouse form)',
    supportedFields: ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'beta',
    note: 'Browser bridge fills safe fields on Stripe’s Greenhouse-hosted form. You attach the CV and submit.',
  },
  {
    key: 'lever',
    capability: 'extension',
    domains: ['jobs.lever.co', 'jobs.eu.lever.co'],
    label: 'Lever',
    supportedFields: ['fullName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'beta',
    note: 'Browser bridge fills name, email, phone, links, and the cover note on Lever-hosted forms. Attach the CV and submit yourself.',
  },
  {
    key: 'ashby',
    capability: 'extension',
    domains: ['jobs.ashbyhq.com'],
    label: 'Ashby',
    supportedFields: ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'beta',
    note: 'Browser bridge fills safe fields on Ashby-hosted application forms. Attach the CV and submit yourself.',
  },
  {
    key: 'aggregator-landing',
    capability: 'extension',
    domains: ['jobicy.com', 'weworkremotely.com', 'remoteok.com', 'remotive.com', 'news.ycombinator.com', 'ycombinator.com', 'reliefweb.int'],
    label: 'Listing page (follows apply link)',
    supportedFields: [],
    auth: 'none (public page)',
    health: 'beta',
    note: 'This is a listing page, not the employer form. The bridge opens it, follows the real application link it contains, and fills safe fields when the destination is a supported portal (Greenhouse, Lever, Ashby, Stripe). Otherwise it hands the page back to you.',
  },
];

const FALLBACK = {
  key: 'manual',
  capability: 'manual',
  domains: [],
  label: 'Manual source',
  supportedFields: [],
  auth: 'unknown',
  health: 'n/a',
  note: 'No verified execution route. Review the pack, open the employer form, and complete it yourself.',
};

/**
 * @param {object} job
 * @returns {{ key, capability, domains, label, supportedFields, auth, health, note, adapterKey }}
 */
// Aggregator hosts whose postings land on a listing page that links out to
// the employer's real form. The extension resolves and follows that link.
const AGGREGATOR_LANDING_HOSTS = new Set([
  'jobicy.com',
  'www.jobicy.com',
  'weworkremotely.com',
  'www.weworkremotely.com',
  'remoteok.com',
  'www.remoteok.com',
  'remotive.com',
  'www.remotive.com',
  'www.ycombinator.com',
  'news.ycombinator.com',
  'reliefweb.int',
  'www.reliefweb.int',
]);

export function getCapabilityDetail(job = {}) {
  const applyUrl = job?.applyUrl || job?.url || '';
  const adapterKey = detectAdapter(applyUrl);
  const entry = CAPABILITY_REGISTRY.find((item) => item.key === adapterKey) || null;
  if (!entry) {
    // Aggregator listing pages: the bridge follows the apply link it resolves
    // on the page, then fills on the destination when that host is supported.
    try {
      const { hostname } = new URL(applyUrl);
      if (AGGREGATOR_LANDING_HOSTS.has(hostname)) {
        const landing = CAPABILITY_REGISTRY.find((item) => item.key === 'aggregator-landing');
        return { ...landing, adapterKey: 'aggregator-landing' };
      }
    } catch { /* malformed URL — keep the fallback */ }
    return {
      ...FALLBACK,
      adapterKey: null,
      // A source-provided applicationCapability wins over the fallback label,
      // but never claims `api` without a registry entry (honest labeling).
      capability: ['api'].includes(job?.applicationCapability) ? 'manual' : job?.applicationCapability || FALLBACK.capability,
    };
  }
  return { ...entry, adapterKey };
}

export const capabilityLabels = {
  api: 'In-site submission available',
  extension: 'Browser-assisted submission next',
  manual: 'Manual source fallback',
  unsupported: 'Submission route not verified',
};