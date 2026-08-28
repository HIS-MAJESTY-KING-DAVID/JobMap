import { useMemo, useState } from 'react';

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

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((row) => row.split(',').map((value) => value.trim().replace(/^"|"$/g, '')));
  if (rows.length < 2) return [];
  const headers = rows.shift().map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  return rows.map((row, index) => {
    const values = Object.fromEntries(headers.map((header, column) => [header, row[column] || '']));
    const title = values.position_title || values.job_title || values.title || 'Imported application';
    const company = values.company_name || values.company || 'Imported employer';
    return { id: `import-${Date.now()}-${index}`, jobId: values.job_id || `imported-${Date.now()}-${index}`, status: values.status?.toLowerCase() || 'applied', createdAt: values.applied_date || new Date().toISOString(), appliedAt: values.applied_date || null, updatedAt: new Date().toISOString(), job: { id: values.job_id || `imported-${Date.now()}-${index}`, title, company, location: values.location || 'Location not specified', applyUrl: values.url || values.apply_url || '' }, followUpAt: values.follow_up_date || null, nextAction: values.next_action || '', followUpNote: values.notes || '' };
  });
}

export default function ApplicationQueuePanel({ applications, onUpdateApplication, onImportApplications, onBack, session }) {
  const [importMessage, setImportMessage] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const dueCount = useMemo(() => applications.filter((application) => application.followUpAt && new Date(application.followUpAt) <= new Date() && !['rejected', 'withdrawn', 'cancelled'].includes(application.status)).length, [applications]);
  const beginConfirmation = (application) => {
    setConfirmingId(application.id);
    setReceiptUrl(application.submissionReceipt?.url || application.job?.applyUrl || '');
    setReceiptReference(application.submissionReceipt?.reference || '');
  };
  const confirmSubmission = (application) => {
    onUpdateApplication(application.id, { status: 'applied', appliedAt: application.appliedAt || new Date().toISOString(), submittedAt: new Date().toISOString(), executionState: 'manual_confirmed', submissionReceipt: { url: receiptUrl.trim() || null, reference: receiptReference.trim() || null, confirmedBy: 'user', confirmedAt: new Date().toISOString() } });
    setConfirmingId(null); setReceiptUrl(''); setReceiptReference('');
  };
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseCsv(await file.text());
      if (!imported.length) throw new Error('empty');
      onImportApplications?.(imported);
      setImportMessage(`${imported.length} application${imported.length === 1 ? '' : 's'} imported for review.`);
    } catch {
      setImportMessage('Could not read that CSV. Include Company, Position Title, Status, Location, and optional dates or links.');
    }
    event.target.value = '';
  };
  return (
    <section className="application-queue" aria-label="ApplyFlow application queue">
      <div className="profile-panel__heading">
        <div>
          <p className="results-kicker">ApplyFlow queue</p>
          <h1>Applications</h1>
        </div>
        <span className="profile-panel__status">{session ? 'Cloud-synced tracker' : 'Local tracker'}</span>
      </div>
      <p className="profile-panel__intro">Packs stay in JobMap until you choose the next action. Direct submissions and manual confirmations are recorded separately.</p>
      <div className="tracker-summary"><span><b>{applications.length}</b> tracked</span><span><b>{applications.filter((application) => ['applied', 'screening', 'interview', 'offer', 'submitted'].includes(application.status)).length}</b> applied or progressing</span><span className={dueCount ? 'tracker-summary__due' : ''}><b>{dueCount}</b> follow-up due</span></div>
      <div className="tracker-tools"><label className="secondary-action"><span>Import CSV</span><input type="file" accept=".csv,text/csv" onChange={handleImport} /></label><span>Import your existing tracker; JobMap previews no credentials and preserves your source notes.</span></div>
      {importMessage && <p className="profile-panel__note">{importMessage}</p>}
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
                {confirmingId === application.id && <div className="application-item__confirmation"><strong>Confirm only after the employer form accepts your application</strong><label><span>Receipt or application URL (optional)</span><input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="https://employer.example/confirmation" inputMode="url" /></label><label><span>Reference number (optional)</span><input value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} placeholder="Confirmation ID" /></label><div className="application-item__actions"><button className="primary-action" type="button" onClick={() => confirmSubmission(application)}>Save evidence</button><button className="secondary-action" type="button" onClick={() => setConfirmingId(null)}>Cancel</button></div></div>}
                {application.events?.length > 0 && <div className="application-item__timeline"><strong>Recent activity</strong>{application.events.slice(-3).reverse().map((event) => <span key={event.id}>{event.type.replaceAll('_', ' ')} · {formatDate(event.createdAt)}</span>)}</div>}
                {(application.submittedAt || application.submissionReceipt || application.executionState) && (
                  <div className="application-item__evidence">
                    <strong>Evidence</strong>
                    <span>{application.submittedAt ? `Submitted ${formatDate(application.submittedAt)}` : 'Not submitted'}</span>
                    <span>{application.executionState ? `Execution: ${application.executionState.replaceAll('_', ' ')}` : 'Execution state unavailable'}</span>
                    {application.submissionReceipt?.url && <a href={application.submissionReceipt.url} target="_blank" rel="noopener noreferrer">Open submission receipt ↗</a>}
                    {application.submissionReceipt?.reference && <span>Reference: {application.submissionReceipt.reference}</span>}
                  </div>
                )}
                <div className="application-item__actions">
                  {!isApplied && !isClosed && (
                    <button className="primary-action" type="button" onClick={() => beginConfirmation(application)}>Confirm submission</button>
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
