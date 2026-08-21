function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDistance(value) {
  return Number.isFinite(value) ? `${Math.round(value)} km` : '';
}

function JobCard({ job, isSelected, isSaved, onSelect, onSave }) {
  return (
    <div className={`job-card ${isSelected ? 'job-card--selected' : ''}`}>
      <button className="job-card__main" onClick={() => onSelect(job.id)} type="button">
        <span className="job-card__eyebrow">{job.company}</span>
        <span className="job-card__title">{job.title}</span>
        <span className="job-card__meta">{job.location}{job.distanceKm !== null && ` · ${formatDistance(job.distanceKm)}`}</span>
        <span className="job-card__footer">
          <span>{job.workMode || 'Work mode not listed'}</span>
          <span>{job.source}</span>
        </span>
      </button>
      <button className={`job-card__save ${isSaved ? 'job-card__save--saved' : ''}`} onClick={() => onSave(job)} type="button" aria-label={isSaved ? 'Remove saved job' : 'Save job'}>
        {isSaved ? '★' : '☆'}
      </button>
    </div>
  );
}

export default function Sidebar({
  jobs,
  totalJobs,
  query,
  onQueryChange,
  locationId,
  locations,
  onLocationChange,
  radiusKm,
  onRadiusChange,
  workMode,
  onWorkModeChange,
  employmentType,
  onEmploymentTypeChange,
  selectedJobId,
  onSelectJob,
  savedJobIds,
  onSaveJob,
  savedSearches,
  onSaveSearch,
  onApplySearch,
  alertEnabled,
  onToggleAlerts,
  lastUpdated,
  isLoading,
  error,
}) {
  const currentLocation = locations.find((location) => location.id === locationId) || locations[0];

  return (
    <aside className="sidebar" aria-label="Job search panel">
      <div className="sidebar__header">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">J</div>
          <div>
            <p className="brand-name">JobMap</p>
            <p className="brand-tagline">Cameroon, work in context.</p>
          </div>
        </div>
        <div className="location-chip"><span className="status-dot" /> {currentLocation.name}</div>
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

        <div className="location-filter">
          <label>
            <span>Search area</span>
            <select value={locationId} onChange={(event) => onLocationChange(event.target.value)}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.region}</option>)}
            </select>
          </label>
          <label>
            <span>Radius</span>
            <select value={radiusKm} onChange={(event) => onRadiusChange(Number(event.target.value))} disabled={locationId === 'all'}>
              <option value={0}>Any distance</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>
          </label>
        </div>

        <div className="filter-grid">
          <label>
            <span>Work mode</span>
            <select value={workMode} onChange={(event) => onWorkModeChange(event.target.value)}>
              <option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option>
            </select>
          </label>
          <label>
            <span>Employment</span>
            <select value={employmentType} onChange={(event) => onEmploymentTypeChange(event.target.value)}>
              <option>All</option><option>Full-time</option><option>Part-time</option><option>Contract</option>
            </select>
          </label>
        </div>

        <div className="control-actions">
          <button className="compact-action" type="button" onClick={onSaveSearch}>Save search</button>
          <button className={`compact-action ${alertEnabled ? 'compact-action--active' : ''}`} type="button" onClick={onToggleAlerts}>
            {alertEnabled ? 'Alerts on' : 'Notify me'}
          </button>
        </div>
        {savedSearches.length > 0 && (
          <div className="saved-searches">
            <span className="saved-searches__label">Saved searches</span>
            {savedSearches.slice(0, 3).map((search) => (
              <button key={search.id} type="button" onClick={() => onApplySearch(search)}>{search.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="results-header">
        <div>
          <p className="results-kicker">Openings in {currentLocation.name}</p>
          <h1>{jobs.length} <span>of {totalJobs} roles</span></h1>
        </div>
        <span className="results-badge">Live feed</span>
      </div>

      <div className="results-list" aria-live="polite">
        {isLoading && <div className="state-card"><span className="spinner" /> Loading current openings…</div>}
        {!isLoading && error && <div className="state-card state-card--error">{error}</div>}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="state-card">
            <strong>No openings match this area.</strong>
            <span>Try All Cameroon, a wider radius, or a broader keyword.</span>
          </div>
        )}
        {!isLoading && !error && jobs.map((job) => (
          <JobCard key={job.id} job={job} isSaved={savedJobIds.includes(job.id)} isSelected={job.id === selectedJobId} onSelect={onSelectJob} onSave={onSaveJob} />
        ))}
      </div>

      <footer className="sidebar__footer">
        <span>Last verified {lastUpdated ? formatDate(lastUpdated) : '—'}</span>
        <span>National sources refresh automatically</span>
      </footer>
    </aside>
  );
}
