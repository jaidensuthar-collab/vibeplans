import { ACTIVITY_LOCATIONS } from '../data/activity-locations';

/** Returns the great-circle distance in miles between two lat/lon points (Haversine formula). */
export function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Converts straight-line miles to an estimated drive-time in minutes.
 * Uses tiered speeds tuned for Austin/Texas driving conditions.
 */
export function milesToDriveMinutes(miles: number): number {
  if (miles <= 2)  return Math.round(miles * 4.0); // ~15 mph surface streets
  if (miles <= 8)  return Math.round(miles * 2.8); // ~21 mph city traffic
  if (miles <= 25) return Math.round(miles * 1.7); // ~35 mph mixed roads
  if (miles <= 60) return Math.round(miles * 1.2); // ~50 mph highway
  return Math.round(miles * 1.0);                  // ~60 mph open highway
}

/**
 * Returns estimated drive-time in minutes from a user's GPS coordinates
 * to a specific activity, or null if the activity has no fixed location.
 */
export function getActivityDriveMinutes(
  activityId: string,
  userLat: number,
  userLon: number
): number | null {
  const loc = ACTIVITY_LOCATIONS[activityId];
  if (!loc) return null;
  const miles = haversineDistanceMiles(userLat, userLon, loc.lat, loc.lon);
  return milesToDriveMinutes(miles);
}

/** Formats drive minutes into a human-readable label. */
export function formatDriveTime(minutes: number): string {
  if (minutes <= 5)  return 'Walking distance';
  if (minutes < 60)  return `~${minutes} min drive`;
  const hrs  = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `~${hrs} hr drive` : `~${hrs} hr ${mins} min drive`;
}
