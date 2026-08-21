function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function JobCard({ job, isSelected, onSelect }) {
  return (
    <button className={`job-card ${isSelected ? 'job-card--selected' : ''}`} onClick={() => onSelect(job.id)} type="button">
      <span className="job-card__eyebrow">{job.company}</span>
      <span className="job-card__title">{job.title}</span>
      <span className="job-card__meta">{job.location}</span>
      <span className="job-card__footer">
        <span>{job.workMode || 'Work mode not listed'}</span>
        <span>{job.source}</span>
      </span>
    </button>
  );
}

export default function Sidebar({
  jobs,
  totalJobs,
  query,
  onQueryChange,
  workMode,
  onWorkModeChange,
  employmentType,
  onEmploymentTypeChange,
  selectedJobId,
  onSelectJob,
  lastUpdated,
  isLoading,
  error,
}) {
  return (
    <aside className="sidebar" aria-label="Job search panel">
      <div className="sidebar__header">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">J</div>
          <div>
            <p className="brand-name">JobMap</p>
            <p className="brand-tagline">Work, placed in context.</p>
          </div>
        </div>
        <div className="location-chip"><span className="status-dot" /> Douala, Cameroon</div>
      </div>

      <div className="sidebar__controls">
        <label className="search-field">
          <span className="sr-only">Search jobs</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, company, or skill"
            type="search"
          />
          {query && <button aria-label="Clear search" className="clear-search" onClick={() => onQueryChange('')} type="button">×</button>}
        </label>

        <div className="filter-grid">
          <label>
            <span>Work mode</span>
            <select value={workMode} onChange={(event) => onWorkModeChange(event.target.value)}>
              <option>All</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
          </label>
          <label>
            <span>Employment</span>
            <select value={employmentType} onChange={(event) => onEmploymentTypeChange(event.target.value)}>
              <option>All</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </label>
        </div>
      </div>

      <div className="results-header">
        <div>
          <p className="results-kicker">Openings near you</p>
          <h1>{jobs.length} <span>of {totalJobs} roles</span></h1>
        </div>
        <span className="results-badge">Live feed</span>
      </div>

      <div className="results-list" aria-live="polite">
        {isLoading && <div className="state-card"><span className="spinner" /> Loading current openings…</div>}
        {!isLoading && error && <div className="state-card state-card--error">{error}</div>}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="state-card">
            <strong>No openings match that search.</strong>
            <span>Try a broader keyword or reset one of the filters.</span>
          </div>
        )}
        {!isLoading && !error && jobs.map((job) => (
          <JobCard key={job.id} job={job} isSelected={job.id === selectedJobId} onSelect={onSelectJob} />
        ))}
      </div>

      <footer className="sidebar__footer">
        <span>Last verified {lastUpdated ? formatDate(lastUpdated) : '—'}</span>
        <span>Sources are refreshed automatically</span>
      </footer>
    </aside>
  );
}
