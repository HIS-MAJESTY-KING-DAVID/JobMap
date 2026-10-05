/**
 * Translate an extension receipt into an ApplyFlow queue state.
 *
 * A portal asking for a CAPTCHA, sign-in, or an answer JobMap intentionally
 * did not fill is not an extension failure. It is a successful, safe pause
 * for the user to complete the employer form. Only conditions that prevent a
 * useful handoff become failures or manual fallbacks.
 */

const USER_ACTION_REASONS = new Set(['captcha', 'auth', 'unexpected_field']);
const MANUAL_FALLBACK_REASONS = new Set([
  'layout_change',
  'network',
  'extension_unreachable',
  'redirected_apply_link',
]);

export function getExtensionOutcome(result = {}) {
  const failureReason = result.failureReason || null;

  if (failureReason === 'revoked') {
    return {
      status: 'cancelled',
      executionState: 'extension_revoked',
      eventType: 'extension_revoked',
      needsUserReason: null,
    };
  }

  if (failureReason === 'expired_job') {
    return {
      status: 'failed',
      executionState: 'extension_failed',
      eventType: 'extension_failed',
      needsUserReason: null,
    };
  }

  if (result.needsUser || USER_ACTION_REASONS.has(failureReason) || result.ok === true) {
    return {
      status: 'needs_user',
      executionState: result.filled > 0 ? 'extension_filled' : 'extension_needs_user',
      eventType: 'extension_paused',
      needsUserReason: result.reason || 'Complete the remaining employer-form steps, then submit it yourself.',
    };
  }

  if (MANUAL_FALLBACK_REASONS.has(failureReason)) {
    return {
      status: 'manual_fallback',
      executionState: 'manual_fallback',
      eventType: 'extension_manual_fallback',
      needsUserReason: result.reason || 'The employer form could not be assisted. Complete it manually; your pack is saved.',
    };
  }

  return {
    status: 'failed',
    executionState: 'extension_failed',
    eventType: 'extension_failed',
    needsUserReason: null,
  };
}
