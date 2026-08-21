import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

function popupFor(job) {
  const safeTitle = job.title.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const safeCompany = job.company.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `
    <div class="job-popup">
      <strong>${safeTitle}</strong>
      <span>${safeCompany}</span>
      <small>${job.location}</small>
      <a href="${job.applyUrl}" target="_blank" rel="noopener noreferrer">View opening ↗</a>
    </div>
  `;
}

export default function MapContainer({ jobs, selectedJobId, onSelectJob }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return undefined;

    const markers = markersRef.current;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([4.0511, 9.7279], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.removeFrom(map));
    markersRef.current.clear();

    jobs.forEach((job) => {
      if (!Number.isFinite(job.lat) || !Number.isFinite(job.lng)) return;
      const marker = L.marker([job.lat, job.lng]).addTo(map);
      marker.bindPopup(popupFor(job));
      marker.on('click', () => onSelectJob(job.id));
      markersRef.current.set(job.id, marker);
    });

    if (jobs.length > 1) {
      const bounds = L.latLngBounds(jobs.map((job) => [job.lat, job.lng]));
      map.fitBounds(bounds.pad(0.22), { maxZoom: 14, animate: true });
    } else if (jobs.length === 1) {
      map.setView([jobs[0].lat, jobs[0].lng], 14, { animate: true });
    }
  }, [jobs, onSelectJob]);

  useEffect(() => {
    const marker = markersRef.current.get(selectedJobId);
    if (marker) marker.openPopup();
  }, [selectedJobId]);

  return <div className="map-canvas" ref={mapRef} aria-label="Map of job openings" />;
}
