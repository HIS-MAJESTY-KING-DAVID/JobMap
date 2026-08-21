import { useCallback, useEffect, useMemo, useState } from 'react';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';
import { fetchJobs, filterJobs, getNewestDate } from './services/JobService';

function App() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [workMode, setWorkMode] = useState('All');
  const [employmentType, setEmploymentType] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchJobs({ signal: controller.signal })
      .then(setJobs)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('We could not load the current job feed.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const filteredJobs = useMemo(
    () => filterJobs(jobs, { query, workMode, employmentType }),
    [jobs, query, workMode, employmentType],
  );

  const activeSelectedJobId = filteredJobs.some((job) => job.id === selectedJobId) ? selectedJobId : null;

  const selectJob = useCallback((jobId) => {
    setSelectedJobId(jobId);
  }, []);

  return (
    <main className="app-shell">
      <Sidebar
        jobs={filteredJobs}
        totalJobs={jobs.length}
        query={query}
        onQueryChange={setQuery}
        workMode={workMode}
        onWorkModeChange={setWorkMode}
        employmentType={employmentType}
        onEmploymentTypeChange={setEmploymentType}
        selectedJobId={activeSelectedJobId}
        onSelectJob={selectJob}
        lastUpdated={getNewestDate(jobs)}
        isLoading={isLoading}
        error={error}
      />
      <section className="map-panel">
        <div className="map-panel__caption">
          <span className="caption-pill">{filteredJobs.length} mapped openings</span>
          <span className="caption-copy">Explore by neighborhood, then open the source listing.</span>
        </div>
        <MapContainer jobs={filteredJobs} selectedJobId={activeSelectedJobId} onSelectJob={selectJob} />
        <div className="map-legend"><span className="legend-marker" /> Job opening</div>
      </section>
    </main>
  );
}

export default App;
