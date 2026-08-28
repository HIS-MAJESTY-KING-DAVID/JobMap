import { useState } from 'react';
import ApplicationQueuePanel from './ApplicationQueuePanel';
import ProfilePanel from './ProfilePanel';
import SourceHealthPanel from './SourceHealthPanel';

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
  eligibleOnly = false,
  onEligibleOnlyChange,
  selectedJobId,
  onSelectJob,
  savedJobIds,
  savedJobs = [],
  onSaveJob,
  onApplyJob,
  savedSearches,
  onSaveSearch,
  onApplySearch,
  alertEnabled,
  onToggleAlerts,
  lastUpdated,
    isLoading,
  error,
  appMode,
  onModeChange,
  activeTab,
  onTabChange,
  applications,
  onUpdateApplication,
  onImportApplications,
  session,
  profile,
  cvDocuments,
  sourceHealth,
  onCvDocumentsChange,
}) {

  const currentLocation = locations.find((location) => location.id === locationId) || locations[0];
  const [swipeIndex, setSwipeIndex] = useState(0);
  const safeSwipeIndex = Math.min(swipeIndex, Math.max(jobs.length - 1, 0));
  const swipeJob = jobs[safeSwipeIndex];
  const visibleJobs = activeTab === 'saved' ? savedJobs : jobs;

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
                <div className="sidebar__account-row">
          <div className="location-chip"><span className="status-dot" /> {appMode === 'remote' ? 'Remote worldwide · from Cameroon' : currentLocation.name}</div>
          {!session && <button className="account-entry" type="button" onClick={() => onTabChange('profile')} aria-label="Open account and sign in">Account / Sign in</button>}
        </div>
        <div className="mode-switch" aria-label="Job discovery mode">
          <button className={appMode === 'local' ? 'mode-switch__button mode-switch__button--active' : 'mode-switch__button'} onClick={() => onModeChange('local')} type="button">
            <span aria-hidden="true">⌖</span> Cameroon Local
          </button>
          <button className={appMode === 'remote' ? 'mode-switch__button mode-switch__button--active' : 'mode-switch__button'} onClick={() => onModeChange('remote')} type="button">
            <span aria-hidden="true">↗</span> Global Remote
          </button>
        </div>

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

                {appMode === 'remote' && <div className="mode-callout"><strong>Cameroon to the world.</strong><span>Remote matches are surfaced here first. Eligibility and timezone checks stay visible before ApplyFlow.</span><button type="button" className={`compact-action ${eligibleOnly ? 'compact-action--active' : ''}`} onClick={() => onEligibleOnlyChange?.(!eligibleOnly)}>{eligibleOnly ? 'Eligible roles only' : 'Include unclear roles'}</button></div>}

        <div className="location-filter">

                    <label className={appMode === 'remote' ? 'filter-disabled' : ''}>
            <span>Search area</span>
            <select value={locationId} onChange={(event) => onLocationChange(event.target.value)} disabled={appMode === 'remote'}>

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

            {activeTab === 'tracker' ? <ApplicationQueuePanel applications={applications} onUpdateApplication={onUpdateApplication} onImportApplications={onImportApplications} onBack={() => onTabChange('discover')} session={session} /> : activeTab === 'profile' ? <ProfilePanel session={session} profile={profile} cvDocuments={cvDocuments} onCvDocumentsChange={onCvDocumentsChange} onBack={() => onTabChange('discover')} /> : (
            activeTab === 'swipe' ? (
              <section className="swipe-queue" aria-label="Swipe discovery queue">
                <div className="results-header"><div><p className="results-kicker">Global Remote queue</p><h1>{Math.max(jobs.length - safeSwipeIndex, 0)} <span>to review</span></h1></div><span className="results-badge">User-controlled</span></div>
                {!isLoading && !error && !swipeJob && <div className="state-card"><strong>You are caught up.</strong><span>Broaden the remote search or come back after the next feed refresh.</span></div>}
                {swipeJob && <article className="swipe-card"><p className="job-detail__source">{swipeJob.source}</p><h2>{swipeJob.title}</h2><strong>{swipeJob.company}</strong><p>{swipeJob.location} · {swipeJob.workMode || 'Remote mode not listed'}</p><p className="swipe-card__description">{swipeJob.description || 'Review the original source for the complete role description.'}</p><div className="job-detail__chips">{swipeJob.remoteEligibility && <span>{swipeJob.remoteEligibility.replaceAll('-', ' ')}</span>}{swipeJob.sourceTrust && <span>{swipeJob.sourceTrust.replaceAll('-', ' ')}</span>}</div><div className="swipe-card__actions"><button className="secondary-action" type="button" onClick={() => setSwipeIndex((index) => index + 1)}>Pass</button><button className="secondary-action" type="button" onClick={() => onSaveJob(swipeJob)}>Save</button><button className="primary-action" type="button" onClick={() => { onApplyJob?.(swipeJob); setSwipeIndex((index) => index + 1); }}>ApplyFlow</button></div></article>}
              </section>
            ) : <>
      <div className="results-header"><div><p className="results-kicker">{activeTab === 'saved' ? 'Saved openings' : `Openings in ${currentLocation.name}`}</p><h1>{visibleJobs.length} <span>{activeTab === 'saved' ? 'saved' : `of ${totalJobs} roles`}</span></h1></div><span className="results-badge">{activeTab === 'saved' ? 'Your list' : 'Live feed'}</span></div>
      <div className="results-list" aria-live="polite">
        {isLoading && activeTab !== 'saved' && <div className="state-card"><span className="spinner" /> Loading current openings…</div>}
        {!isLoading && error && activeTab !== 'saved' && <div className="state-card state-card--error">{error}</div>}
        {!isLoading && !error && visibleJobs.length === 0 && <div className="state-card"><strong>{activeTab === 'saved' ? 'No saved openings yet.' : 'No openings match this area.'}</strong><span>{activeTab === 'saved' ? 'Save a role from the feed to keep it here.' : 'Try All Cameroon, a wider radius, or a broader keyword.'}</span></div>}
        {!isLoading && !error && visibleJobs.map((job) => <JobCard key={job.id} job={job} isSaved={savedJobIds.includes(job.id)} isSelected={job.id === selectedJobId} onSelect={onSelectJob} onSave={onSaveJob} />)}
      </div>
      </>)}

            <SourceHealthPanel metadata={sourceHealth} />
            <footer className="sidebar__footer">

        <span>Last verified {lastUpdated ? formatDate(lastUpdated) : '—'}</span>
        <span>{appMode === 'remote' ? 'Global remote feed · source links preserved' : 'National sources refresh automatically'}</span>
      </footer>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {[
          ['discover', '⌕', 'Discover'],
          ['swipe', '↗', 'Swipe'],
          ['saved', '☆', 'Saved'],
          ['tracker', '✓', 'Tracker'],
          ['profile', '◉', 'Profile'],
        ].map(([tab, icon, label]) => (
          <button
            className={activeTab === tab ? 'mobile-nav__item mobile-nav__item--active' : 'mobile-nav__item'}
            key={tab}
            onClick={() => {
              if (tab === 'discover') onModeChange('local');
              if (tab === 'swipe') onModeChange('remote');
              onTabChange(tab);
            }}
            type="button"
          >
            <span className="mobile-nav__icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

    </aside>
  );
}
