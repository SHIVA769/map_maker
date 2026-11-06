// Browser-side key for the Maps JavaScript API. The NEXT_PUBLIC name is mirrored
// for compatibility; this plain static app does not load .env files.
// Restrict this visible key to your site's HTTP referrers and Maps JavaScript API.
const googleApiKey = "AIzaSyBqzJAUvM4lUqFLfUF0UUdTCYpiz0frrj0";
window.APP_CONFIG = {
  GOOGLE_API_KEY: googleApiKey,
  NEXT_PUBLIC_GOOGLE_API_KEY: googleApiKey,
  GOOGLE_MAPS_API_KEY: googleApiKey,
  DEFAULT_CENTER: { lat: 30.9010, lng: 75.8573 },
  DEFAULT_ZOOM: 20,
  METERS_PER_MAP_UNIT: 0.140136,
};
