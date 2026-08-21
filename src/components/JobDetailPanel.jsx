function formatDate(value) {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDistance(value) {
  return Number.isFinite(value) ? `${Math.round(value)} km away` : 'Distance unavailable';
}

export default function JobDetailPanel({ job, onClose, onSave, isSaved }) {
  if (!job) return null;

  return (
    <section className="job-detail" aria-label="Selected job details">
      <div className="job-detail__topline">
        <span className="job-detail__source">{job.source}</span>
        <button className="job-detail__close" type="button" onClick={onClose} aria-label="Close job details">×</button>
      </div>
      <h2>{job.title}</h2>
      <p className="job-detail__company">{job.company}</p>
      <p className="job-detail__location">{job.location}{job.distanceKm !== null && ` · ${formatDistance(job.distanceKm)}`}</p>
      <div className="job-detail__chips">
        {job.workMode && <span>{job.workMode}</span>}
        {job.employmentType && <span>{job.employmentType}</span>}
        {job.salary && <span>{job.salary}</span>}
      </div>
      <p className="job-detail__description">{job.description}</p>
      <div className="job-detail__facts">
        <span><b>Posted</b>{formatDate(job.postedAt)}</span>
        <span><b>Last verified</b>{formatDate(job.lastVerifiedAt)}</span>
        <span><b>Location source</b>{job.locationConfidence === 'source' ? 'Employer/source' : 'Estimated from city'}</span>
      </div>
      <div className="job-detail__actions">
        <a className="primary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Open application ↗</a>
        <button className={`secondary-action ${isSaved ? 'secondary-action--saved' : ''}`} type="button" onClick={() => onSave(job)}>
          {isSaved ? 'Saved' : 'Save opening'}
        </button>
      </div>
      <a className="job-detail__source-link" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">View original source</a>
    </section>
  );
}
