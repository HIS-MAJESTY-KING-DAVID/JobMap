const statusLabels = {
  draft: 'Draft',
  ready_for_approval: 'Ready for review',
  needs_user: 'Needs your input',
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

function formatDate(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatFollowUp(value) {
  if (!value) return 'No follow-up date';
  return `Follow up ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))}`;
}

export default function ApplicationQueuePanel({ applications, onUpdateApplication, onBack }) {
  return (
    <section className="application-queue" aria-label="ApplyFlow application queue">
      <div className="profile-panel__heading">
        <div>
          <p className="results-kicker">ApplyFlow queue</p>
          <h1>Applications</h1>
        </div>
        <span className="profile-panel__status">Local tracker</span>
      </div>
      <p className="profile-panel__intro">Packs stay in JobMap until you choose the next action. Direct submissions and manual confirmations are recorded separately.</p>
      {applications.length === 0 ? (
        <div className="state-card"><strong>Your queue is empty.</strong><span>Open a job, start ApplyFlow, and save an application pack here.</span></div>
      ) : (
        <div className="application-queue__list">
          {applications.map((application) => {
            const isClosed = ['cancelled', 'rejected', 'withdrawn'].includes(application.status);
            const isApplied = ['applied', 'screening', 'interview', 'offer', 'submitted'].includes(application.status);
            return (
              <article className="application-item" key={application.id}>
                <div className="application-item__topline">
                  <span className="job-detail__source">{application.job?.company || 'Employer'}</span>
                  <span className={`application-status application-status--${application.status}`}>{statusLabels[application.status] || application.status}</span>
                </div>
                <h2>{application.job?.title || application.pack?.targetRole || 'Untitled application'}</h2>
                <p>{application.job?.location || 'Location not specified'} · Updated {formatDate(application.updatedAt || application.createdAt)}</p>
                <p className="application-item__followup">{formatFollowUp(application.followUpAt)}{application.nextAction ? ` · ${application.nextAction}` : ''}</p>
                <div className="application-item__actions">
                  {!isApplied && !isClosed && (
                    <button className="primary-action" type="button" onClick={() => onUpdateApplication(application.id, { status: 'applied', appliedAt: new Date().toISOString(), executionState: 'manual_confirmed' })}>Mark as applied</button>
                  )}
                  {isApplied && !isClosed && (
                    <select aria-label="Application status" value={application.status} onChange={(event) => onUpdateApplication(application.id, { status: event.target.value })}>
                      {['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  )}
                  {!isClosed && application.status !== 'submitted' && (
                    <button className="secondary-action" type="button" onClick={() => onUpdateApplication(application.id, { status: 'needs_user' })}>Needs my input</button>
                  )}
                  {!isClosed && (
                    <button className="secondary-action" type="button" onClick={() => onUpdateApplication(application.id, { status: 'cancelled' })}>Cancel</button>
                  )}
                  {application.job?.applyUrl && application.status !== 'submitted' && (
                    <a className="secondary-action" href={application.job.applyUrl} target="_blank" rel="noopener noreferrer">Continue manually ↗</a>
                  )}
                </div>
                {!isClosed && (
                  <div className="application-item__followup-editor">
                    <label><span>Follow-up date</span><input type="date" value={application.followUpAt ? application.followUpAt.slice(0, 10) : ''} onChange={(event) => onUpdateApplication(application.id, { followUpAt: event.target.value ? new Date(`${event.target.value}T09:00:00`).toISOString() : null })} /></label>
                    <label><span>Next action</span><input value={application.nextAction || ''} onChange={(event) => onUpdateApplication(application.id, { nextAction: event.target.value })} placeholder="Example: Send follow-up email" /></label>
                    <label><span>Notes</span><textarea value={application.followUpNote || ''} onChange={(event) => onUpdateApplication(application.id, { followUpNote: event.target.value })} rows="2" placeholder="Recruiter, receipt, or follow-up notes" /></label>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <button className="secondary-action application-queue__back" type="button" onClick={onBack}>Back to jobs</button>
    </section>
  );
}
