import { useCallback, useEffect, useMemo, useState } from 'react';
import JobDetailPanel from './components/JobDetailPanel';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';
import { cameroonLocations, defaultLocationId, getLocationById } from './data/locations';
import { fetchJobs, filterJobs, getNewestDate } from './services/JobService';
import {
  getAlertedJobIds,
  getAlertsEnabled,
  getSavedJobs,
  getSavedSearches,
  markJobsAlerted,
  saveSearch,
  setAlertsEnabled as persistAlertsEnabled,
  toggleSavedJob,
} from './services/storage';

function App() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [radiusKm, setRadiusKm] = useState(0);
  const [workMode, setWorkMode] = useState('All');
  const [employmentType, setEmploymentType] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [savedJobs, setSavedJobs] = useState(() => getSavedJobs());
  const [savedSearches, setSavedSearches] = useState(() => getSavedSearches());
  const [alertEnabled, setAlertEnabled] = useState(() => getAlertsEnabled());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs({ signal: controller.signal })
      .then(setJobs)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('We could not load the current national job feed.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const selectedLocation = useMemo(() => getLocationById(locationId), [locationId]);
  const filteredJobs = useMemo(
    () => filterJobs(jobs, { query, workMode, employmentType, origin: selectedLocation, radiusKm }),
    [jobs, query, workMode, employmentType, selectedLocation, radiusKm],
  );
  const activeSelectedJobId = filteredJobs.some((job) => job.id === selectedJobId) ? selectedJobId : null;
  const selectedJob = filteredJobs.find((job) => job.id === activeSelectedJobId) || null;
  const savedJobIds = savedJobs.map((job) => job.id);

  useEffect(() => {
    if (!alertEnabled || !savedSearches.length || !jobs.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    const alreadyAlerted = new Set(getAlertedJobIds());
    const newMatches = [];
    savedSearches.forEach((search) => {
      const origin = getLocationById(search.locationId || 'all');
      filterJobs(jobs, {
        query: search.query || '',
        workMode: search.workMode || 'All',
        employmentType: search.employmentType || 'All',
        origin,
        radiusKm: search.radiusKm || 0,
      }).forEach((job) => {
        if (!alreadyAlerted.has(job.id)) newMatches.push(job);
      });
    });
    const uniqueMatches = [...new Map(newMatches.map((job) => [job.id, job])).values()].slice(0, 3);
    uniqueMatches.forEach((job) => {
      new Notification(`New JobMap opening: ${job.title}`, { body: `${job.company} · ${job.location}` });
    });
    if (uniqueMatches.length) markJobsAlerted(uniqueMatches.map((job) => job.id));
  }, [alertEnabled, jobs, savedSearches]);

  const selectJob = useCallback((jobId) => {
    setSelectedJobId(jobId);
  }, []);

  const changeLocation = useCallback((nextLocationId) => {
    setLocationId(nextLocationId);
    setRadiusKm(nextLocationId === 'all' ? 0 : 50);
  }, []);

  const saveCurrentSearch = useCallback(() => {
    const location = getLocationById(locationId);
    const labelParts = [query || 'All roles', location.name, radiusKm ? `${radiusKm} km` : 'any distance'];
    const next = saveSearch({
      id: `${Date.now()}`,
      label: labelParts.join(' · '),
      query,
      locationId,
      radiusKm,
      workMode,
      employmentType,
    });
    setSavedSearches(next);
  }, [query, locationId, radiusKm, workMode, employmentType]);

  const applySavedSearch = useCallback((search) => {
    setQuery(search.query || '');
    setLocationId(search.locationId || 'all');
    setRadiusKm(search.radiusKm || 0);
    setWorkMode(search.workMode || 'All');
    setEmploymentType(search.employmentType || 'All');
  }, []);

  const saveCurrentJob = useCallback((job) => {
    setSavedJobs(toggleSavedJob(job));
  }, []);

  const toggleAlerts = useCallback(async () => {
    if (alertEnabled) {
      setAlertEnabled(persistAlertsEnabled(false));
      return;
    }
    if (!('Notification' in window)) return;
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') setAlertEnabled(persistAlertsEnabled(true));
  }, [alertEnabled]);

  return (
    <main className="app-shell">
      <Sidebar
        jobs={filteredJobs}
        totalJobs={jobs.length}
        query={query}
        onQueryChange={setQuery}
        locationId={locationId}
        locations={cameroonLocations}
        onLocationChange={changeLocation}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        workMode={workMode}
        onWorkModeChange={setWorkMode}
        employmentType={employmentType}
        onEmploymentTypeChange={setEmploymentType}
        selectedJobId={activeSelectedJobId}
        onSelectJob={selectJob}
        savedJobIds={savedJobIds}
        onSaveJob={saveCurrentJob}
        savedSearches={savedSearches}
        onSaveSearch={saveCurrentSearch}
        onApplySearch={applySavedSearch}
        alertEnabled={alertEnabled}
        onToggleAlerts={toggleAlerts}
        lastUpdated={getNewestDate(jobs)}
        isLoading={isLoading}
        error={error}
      />
      <section className="map-panel">
        <div className="map-panel__caption">
          <span className="caption-pill">{filteredJobs.length} mapped openings</span>
          <span className="caption-copy">{selectedLocation.name} · explore by place, then open the source listing.</span>
        </div>
        <MapContainer jobs={filteredJobs} selectedJobId={activeSelectedJobId} onSelectJob={selectJob} mapCenter={selectedLocation} />
        <div className="map-legend"><span className="legend-marker" /> Job opening</div>
        <JobDetailPanel job={selectedJob} onClose={() => setSelectedJobId(null)} onSave={saveCurrentJob} isSaved={selectedJob ? savedJobIds.includes(selectedJob.id) : false} />
      </section>
    </main>
  );
}

export default App;
