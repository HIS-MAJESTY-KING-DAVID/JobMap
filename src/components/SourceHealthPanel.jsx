function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function SourceHealthPanel({ metadata }) {
  if (!metadata?.sources?.length) return null;
  const healthy = metadata.sources.filter((source) => source.status === 'ok').length;
  return <details className="source-health"><summary><span>Source health</span><strong>{healthy}/{metadata.sources.length} healthy</strong></summary><p>{metadata.jobs || 0} published roles · refreshed {formatDate(metadata.generatedAt)}</p><div className="source-health__list">{metadata.sources.map((source) => <div key={source.id}><span className={`source-health__dot source-health__dot--${source.status}`} aria-hidden="true" /><span>{source.label}</span><small>{source.status === 'ok' ? `${source.fetched || 0} roles` : source.error || 'Needs attention'}</small></div>)}</div></details>;
}
