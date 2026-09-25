/**
 * Calculate the great-circle distance between two points on the Earth
 * using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1 (in decimal degrees)
 * @param {number} lon1 - Longitude of point 1 (in decimal degrees)
 * @param {number} lat2 - Latitude of point 2 (in decimal degrees)
 * @param {number} lon2 - Longitude of point 2 (in decimal degrees)
 * @returns {number} Distance in kilometers rounded to 1 decimal place
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 15.0; // fallback sensible default distance
  }

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km} km away`;
};

module.exports = { calculateDistanceKm, formatDistance };
