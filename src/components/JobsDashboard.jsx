import { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

import { revokeAutofillBundle } from '../services/fieldAutofill.js';

const STATUS_LABELS = {
  draft: 'Draft',
  ready_for_approval: 'Ready for review',
  ready_for_user_approval: 'Ready for your approval',
  queued: 'Queued for execution',
  filling: 'Filling',
  needs_user: 'Needs input',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  submitted: 'Submitted',
  failed: 'Failed safely',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  manual_fallback: 'Manual fallback',
};

const STATUS_COLORS = {
  draft: '#6b7280',
  ready_for_approval: '#8b5cf6',
  ready_for_user_approval: '#8b5cf6',
  queued: '#6366f1',
  filling: '#0ea5e9',
  needs_user: '#f59e0b',
  applied: '#3b82f6',
  screening: '#06b6d4',
  interview: '#10b981',
  offer: '#22c55e',
  rejected: '#ef4444',
  submitted: '#3b82f6',
  failed: '#f97316',
  cancelled: '#6b7280',
  withdrawn: '#6b7280',
  manual_fallback: '#9ca3af',
};

const ACTIVE_STATUSES = new Set(['applied', 'screening', 'interview', 'offer', 'submitted']);
const CLOSED_STATUSES = new Set(['rejected', 'withdrawn', 'cancelled']);

const FAILURE_REASON_LABELS = {
  captcha: 'CAPTCHA blocked',
  auth: 'Login / MFA required',
  unexpected_field: 'Required field not approved',
  layout_change: 'Form layout changed',
  expired_job: 'Job is no longer accepting applications',
  network: 'Network error',
  extension_unreachable: 'Employer page did not answer',
  revoked: 'Handoff was revoked',
};

const LANE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'queued', label: 'Queued' },
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'closed', label: 'Closed' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function isFollowUpDue(application) {
  return (
    application.followUpAt &&
    new Date(application.followUpAt) <= new Date() &&
    !CLOSED_STATUSES.has(application.status)
  );
}

function matchesLane(application, lane) {
  if (lane === 'all') return true;
  if (lane === 'closed') return CLOSED_STATUSES.has(application.status);
  return application.status === lane;
}

// ---------------------------------------------------------------------------
// Stats ring (SVG donut)
// ---------------------------------------------------------------------------

function StatsRing({ applications }) {
  const total = applications.length;
  const applied = applications.filter((a) => ACTIVE_STATUSES.has(a.status)).length;
  const offers = applications.filter((a) => a.status === 'offer').length;
  const closed = applications.filter((a) => CLOSED_STATUSES.has(a.status)).length;
  const draft = total - applied - closed;

  const segments = [
    { value: applied, color: '#3b82f6', label: 'Applied / Active' },
    { value: offers, color: '#22c55e', label: 'Offers' },
    { value: closed, color: '#ef4444', label: 'Closed' },
    { value: Math.max(0, draft), color: '#6b7280', label: 'Draft' },
  ].filter((s) => s.value > 0);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="dash-ring-wrapper">
      <svg className="dash-ring" viewBox="0 0 100 100" aria-label="Application status breakdown">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--surface-2, #1e293b)" strokeWidth="14" />
        {total === 0 ? (
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#334155" strokeWidth="14" strokeDasharray={circumference} />
        ) : (
          segments.map((segment, i) => {
            const dash = (segment.value / total) * circumference;
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            );
            offset += dash;
            return el;
          })
        )}
        <text x="50" y="46" textAnchor="middle" className="dash-ring__count">{total}</text>
        <text x="50" y="58" textAnchor="middle" className="dash-ring__label">tracked</text>
      </svg>
      <div className="dash-ring-legend">
        {segments.map((s) => (
          <span key={s.label} className="dash-ring-legend__item">
            <span className="dash-ring-legend__dot" style={{ background: s.color }} />
            {s.value} {s.label}
          </span>
        ))}
        {total === 0 && <span className="dash-ring-legend__item" style={{ color: 'var(--text-muted)' }}>No applications yet</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportToCsv(applications) {
  const headers = ['Company', 'Position Title', 'Status', 'Location', 'Applied Date', 'Follow-up Date', 'Next Action', 'Notes', 'Receipt URL'];
  const rows = applications.map((app) => [
    app.job?.company || '',
    app.job?.title || app.pack?.targetRole || '',
    STATUS_LABELS[app.status] || app.status || '',
    app.job?.location || '',
    app.appliedAt ? formatDate(app.appliedAt) : '',
    app.followUpAt ? formatDate(app.followUpAt) : '',
    app.nextAction || '',
    app.followUpNote || '',
    app.submissionReceipt?.url || app.job?.applyUrl || '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jobmap-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Application card
// ---------------------------------------------------------------------------

function AppCard({ application, onUpdate, onReApply }) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const isClosed = CLOSED_STATUSES.has(application.status);
  const isActive = ACTIVE_STATUSES.has(application.status);
  const due = isFollowUpDue(application);
  const color = STATUS_COLORS[application.status] || '#6b7280';
  const initial = (application.job?.company || 'J').charAt(0).toUpperCase();

  return (
    <article className="dash-card" aria-label={`${application.job?.title || 'Application'} at ${application.job?.company || 'employer'}`}>
      <div className="dash-card__left">
        <div className="dash-card__avatar" style={{ background: `${color}22`, color }}>
          {initial}
        </div>
      </div>
      <div className="dash-card__body">
        <div className="dash-card__topline">
          <span className="dash-card__company">{application.job?.company || 'Employer'}</span>
          <span className="dash-card__badge" style={{ background: `${color}22`, color }}>
            {STATUS_LABELS[application.status] || application.status}
          </span>
        </div>
        <p className="dash-card__title">{application.job?.title || application.pack?.targetRole || 'Untitled application'}</p>
        <p className="dash-card__meta">
          {application.job?.location && <span>{application.job.location}</span>}
          {application.appliedAt && <span>Applied {formatDate(application.appliedAt)}</span>}
          {application.updatedAt && !application.appliedAt && <span>Updated {formatDate(application.updatedAt)}</span>}
        </p>
        {due && (
          <p className="dash-card__followup-alert" role="alert">
            ⏰ Follow-up due {formatDate(application.followUpAt)}
            {application.nextAction ? ` · ${application.nextAction}` : ''}
          </p>
        )}

        {/* Typed execution failure */}
        {application.status === 'failed' && (
          <p className="dash-card__failure" role="alert">
            Failed: {FAILURE_REASON_LABELS[application.failureReason] || application.failureReason || 'unexpected problem'}
            {application.events?.slice(-1)[0]?.metadata?.reason ? ` · ${application.events.slice(-1)[0].metadata.reason}` : ''}
          </p>
        )}
        {application.status === 'needs_user' && application.needsUserReason && (
          <p className="dash-card__needs-user">Needs you: {application.needsUserReason}</p>
        )}
        {application.executionState && application.executionState !== 'manual_confirmed' && (
          <p className="dash-card__execution">Execution: {application.executionState.replaceAll('_', ' ')}{application.executionRoute ? ` via ${application.executionRoute}` : ''}</p>
        )}

        {/* Event timeline — last 3 events */}
        {application.events?.length > 0 && (
          <div className="dash-card__timeline">
            {application.events.slice(-3).reverse().map((ev) => (
              <span key={ev.id} className="dash-card__event">
                {ev.type.replaceAll('_', ' ')}
                {ev.type === 'extension_fill' && ev.metadata?.filled !== undefined
                  ? ` · ${ev.metadata.filled} field${ev.metadata.filled === 1 ? '' : 's'} filled`
                  : ''}
              </span>
            ))}
          </div>
        )}

        <div className="dash-card__actions">
          {/* Status selector for active applications */}
          {isActive && !isClosed && (
            <select
              aria-label="Update application status"
              value={application.status}
              onChange={(e) => onUpdate(application.id, { status: e.target.value })}
              className="dash-card__select"
            >
              {['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}

          {/* Receipt / Apply URL (execution-failing states get Continue manually below) */}
          {!['failed', 'needs_user', 'queued', 'manual_fallback'].includes(application.status) && (application.submissionReceipt?.url || application.job?.applyUrl) && (
            <a
              className="dash-card__action-link"
              href={application.submissionReceipt?.url || application.job?.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {application.submissionReceipt?.url ? 'Receipt ↗' : 'Source ↗'}
            </a>
          )}

          {/* Retry a failed / queued / needs-user fill via ApplyFlow */}
          {!isClosed && onReApply && application.job?.id && ['failed', 'queued', 'needs_user', 'ready_for_approval', 'ready_for_user_approval'].includes(application.status) && (
            <button
              className="dash-card__action-btn"
              type="button"
              onClick={() => onReApply(application.job)}
            >
              Retry in ApplyFlow
            </button>
          )}

          {/* Continue manually on the employer form */}
          {!isClosed && ['failed', 'needs_user', 'queued', 'manual_fallback'].includes(application.status) && (application.job?.applyUrl || application.submissionReceipt?.url) && (
            <a
              className="dash-card__action-link"
              href={application.job?.applyUrl || application.submissionReceipt?.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Continue manually ↗
            </a>
          )}

          {/* Re-open ApplyFlow for any open application */}
          {!isClosed && onReApply && application.job?.id && !['failed', 'queued', 'needs_user', 'ready_for_approval', 'ready_for_user_approval'].includes(application.status) && (
            <button
              className="dash-card__action-btn"
              type="button"
              onClick={() => onReApply(application.job)}
            >
              ApplyFlow ↗
            </button>
          )}

          {/* Follow-up editor toggle */}
          {!isClosed && (
            <button
              className="dash-card__action-btn"
              type="button"
              onClick={() => setShowFollowUp((v) => !v)}
            >
              {showFollowUp ? 'Close' : 'Follow-up'}
            </button>
          )}

          {/* Cancel — revokes any live extension bundle first */}
          {!isClosed && (
            <button
              className="dash-card__action-btn dash-card__action-btn--danger"
              type="button"
              onClick={() => {
                const bundleId = application.pack?.autofillBundle?.bundleId || application.autofillBundle?.bundleId;
                if (bundleId) revokeAutofillBundle(bundleId);
                onUpdate(application.id, { status: 'cancelled' });
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Follow-up inline editor */}
        {showFollowUp && !isClosed && (
          <div className="dash-card__followup-editor">
            <label>
              <span>Follow-up date</span>
              <input
                type="date"
                value={application.followUpAt ? application.followUpAt.slice(0, 10) : ''}
                onChange={(e) => onUpdate(application.id, { followUpAt: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })}
              />
            </label>
            <label>
              <span>Next action</span>
              <input
                value={application.nextAction || ''}
                onChange={(e) => onUpdate(application.id, { nextAction: e.target.value })}
                placeholder="e.g. Send follow-up email"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                value={application.followUpNote || ''}
                onChange={(e) => onUpdate(application.id, { followUpNote: e.target.value })}
                rows="2"
                placeholder="Recruiter, receipt, or follow-up notes"
              />
            </label>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function JobsDashboard({ applications, onUpdateApplication, onApplyJob, session, onBack }) {
  const [lane, setLane] = useState('all');
  const [search, setSearch] = useState('');

  const dueCount = useMemo(
    () => applications.filter(isFollowUpDue).length,
    [applications],
  );

  const filteredApplications = useMemo(() => {
    let list = applications.filter((app) => matchesLane(app, lane));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (app) =>
          (app.job?.company || '').toLowerCase().includes(q) ||
          (app.job?.title || '').toLowerCase().includes(q) ||
          (app.pack?.targetRole || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [applications, lane, search]);

  return (
    <section className="jobs-dashboard" aria-label="Jobs management dashboard">

      {/* Header */}
      <div className="profile-panel__heading">
        <div>
          <p className="results-kicker">ApplyFlow tracker</p>
          <h1>My Applications</h1>
        </div>
        <span className="profile-panel__status">{session ? 'Cloud-synced' : 'Local tracker'}</span>
      </div>

      {/* Stats ring */}
      <StatsRing applications={applications} />

      {/* Summary pills */}
      <div className="dash-summary">
        <span><b>{applications.length}</b> tracked</span>
        <span><b>{applications.filter((a) => ACTIVE_STATUSES.has(a.status)).length}</b> active</span>
        {dueCount > 0 && (
          <span className="dash-summary__due">
            <b>{dueCount}</b> follow-up{dueCount !== 1 ? 's' : ''} due
          </span>
        )}
      </div>

      {/* Search + export */}
      <div className="dash-toolbar">
        <label className="dash-search" aria-label="Search applications">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or role…"
            type="search"
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </label>
        <button
          className="secondary-action"
          type="button"
          onClick={() => exportToCsv(applications)}
          disabled={applications.length === 0}
          aria-label="Export applications to CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Lane tabs */}
      <div className="dash-lanes" role="tablist" aria-label="Filter by status">
        {LANE_TABS.map(({ key, label }) => {
          const count = key === 'all'
            ? applications.length
            : key === 'closed'
              ? applications.filter((a) => CLOSED_STATUSES.has(a.status)).length
              : applications.filter((a) => a.status === key).length;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={lane === key}
              className={`dash-lane-tab ${lane === key ? 'dash-lane-tab--active' : ''}`}
              type="button"
              onClick={() => setLane(key)}
            >
              {label}
              {count > 0 && <span className="dash-lane-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Application cards */}
      <div className="dash-list">
        {filteredApplications.length === 0 ? (
          <div className="state-card">
            {applications.length === 0
              ? <><strong>Your tracker is empty.</strong><span>Open a job, start ApplyFlow, and save an application pack to begin tracking.</span></>
              : <><strong>No applications match this filter.</strong><span>Try a different lane or clear the search.</span></>}
          </div>
        ) : (
          filteredApplications.map((app) => (
            <AppCard
              key={app.id}
              application={app}
              onUpdate={onUpdateApplication}
              onReApply={onApplyJob}
            />
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="dash-footer-actions">
        <button className="secondary-action" type="button" onClick={onBack}>Back to jobs</button>
      </div>
    </section>
  );
}
