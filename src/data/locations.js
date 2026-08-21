export const cameroonLocations = [
  { id: 'all', name: 'All Cameroon', region: 'National view', lat: 5.65, lng: 12.35, zoom: 6 },
  { id: 'douala', name: 'Douala', region: 'Littoral', lat: 4.0511, lng: 9.7679, zoom: 12 },
  { id: 'yaounde', name: 'Yaoundé', region: 'Centre', lat: 3.848, lng: 11.5021, zoom: 12 },
  { id: 'bafoussam', name: 'Bafoussam', region: 'West', lat: 5.4781, lng: 10.4176, zoom: 12 },
  { id: 'bamenda', name: 'Bamenda', region: 'North-West', lat: 5.9597, lng: 10.1459, zoom: 12 },
  { id: 'buea', name: 'Buea', region: 'South-West', lat: 4.1527, lng: 9.241, zoom: 12 },
  { id: 'limbe', name: 'Limbe', region: 'South-West', lat: 4.0236, lng: 9.2069, zoom: 12 },
  { id: 'kumba', name: 'Kumba', region: 'South-West', lat: 4.6363, lng: 9.4469, zoom: 12 },
  { id: 'kribi', name: 'Kribi', region: 'South', lat: 2.9406, lng: 9.9103, zoom: 12 },
  { id: 'ebolowa', name: 'Ebolowa', region: 'South', lat: 2.9167, lng: 11.15, zoom: 12 },
  { id: 'bertoua', name: 'Bertoua', region: 'East', lat: 4.5773, lng: 13.6846, zoom: 12 },
  { id: 'ngaoundere', name: 'Ngaoundéré', region: 'Adamawa', lat: 7.3167, lng: 13.5833, zoom: 12 },
  { id: 'garoua', name: 'Garoua', region: 'North', lat: 9.3014, lng: 13.3977, zoom: 12 },
  { id: 'maroua', name: 'Maroua', region: 'Far North', lat: 10.591, lng: 14.3159, zoom: 12 },
  { id: 'kousseri', name: 'Kousseri', region: 'Far North', lat: 12.0769, lng: 15.0306, zoom: 12 },
  { id: 'nkongsamba', name: 'Nkongsamba', region: 'Littoral', lat: 5.6333, lng: 9.95, zoom: 12 },
  { id: 'edea', name: 'Edéa', region: 'Littoral', lat: 3.8, lng: 10.1333, zoom: 12 },
  { id: 'foumban', name: 'Foumban', region: 'West', lat: 5.7266, lng: 10.898, zoom: 12 },
  { id: 'dschang', name: 'Dschang', region: 'West', lat: 5.452, lng: 10.057, zoom: 12 },
  { id: 'mbalmayo', name: 'Mbalmayo', region: 'Centre', lat: 3.5167, lng: 11.5, zoom: 12 },
  { id: 'sangmelima', name: 'Sangmélima', region: 'South', lat: 2.9333, lng: 11.9833, zoom: 12 },
];

export const defaultLocationId = 'all';

export function getLocationById(locationId) {
  return cameroonLocations.find((location) => location.id === locationId) || cameroonLocations[0];
}

export function locationForJob(job) {
  const haystack = `${job.city || ''} ${job.location || ''}`.toLowerCase();
  return cameroonLocations.find((location) => location.id !== 'all' && haystack.includes(location.name.toLowerCase())) || null;
}
