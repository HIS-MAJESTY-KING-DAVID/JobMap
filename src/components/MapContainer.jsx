import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchJobs } from '../services/JobService';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapContainer = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (mapRef.current && !mapInstanceRef.current) {
            // Initialize map
            const map = L.map(mapRef.current).setView([4.0511, 9.7679], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapInstanceRef.current = map;

            // Load jobs
            const loadJobs = async () => {
                const jobs = await fetchJobs();
                jobs.forEach(job => {
                    const marker = L.marker([job.lat, job.lng]).addTo(map);
                    marker.bindPopup(`
                        <div class="p-2">
                            <h3 class="font-bold text-lg">${job.company}</h3>
                            <p class="text-sm font-semibold">${job.title}</p>
                            <p class="text-xs text-gray-600 mb-2">${job.description}</p>
                            <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 text-sm hover:underline">
                                Visit Website
                            </a>
                        </div>
                    `);
                });
            };
            loadJobs();
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />;
};

export default MapContainer;
