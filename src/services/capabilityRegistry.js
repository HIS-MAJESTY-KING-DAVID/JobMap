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
    domains: ['jobs.lever.co'],
    label: 'Lever',
    supportedFields: ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'unverified',
    note: 'Adapter not implemented yet. Treat as manual until the bridge is tested.',
  },
  {
    key: 'ashby',
    capability: 'extension',
    domains: ['jobs.ashbyhq.com'],
    label: 'Ashby',
    supportedFields: ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'portfolio', 'coverNote'],
    auth: 'none (public form)',
    health: 'unverified',
    note: 'Adapter not implemented yet. Treat as manual until the bridge is tested.',
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
export function getCapabilityDetail(job = {}) {
  const applyUrl = job?.applyUrl || job?.url || '';
  const adapterKey = detectAdapter(applyUrl);
  const entry = CAPABILITY_REGISTRY.find((item) => item.key === adapterKey) || null;
  if (!entry) {
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