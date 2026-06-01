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
 * Converts straight-line (Haversine) miles to estimated drive-time in minutes.
 *
 * Austin road distances typically run 1.3–1.6× the straight-line distance, plus
 * traffic delays. These multipliers are calibrated against real Google Maps times
 * from multiple Austin-area starting points (Steiner Ranch, downtown, South Austin).
 *
 *   ≤ 2 mi  → local streets, ~12 mph  → × 5.0
 *   ≤ 8 mi  → mixed city,   ~19 mph  → × 3.2
 *   ≤ 20 mi → city + hwy,   ~24 mph  → × 2.5
 *   ≤ 60 mi → highway,      ~40 mph  → × 1.5
 *   > 60 mi → open highway, ~55 mph  → × 1.1
 */
export function milesToDriveMinutes(miles: number): number {
  if (miles <= 2)  return Math.round(miles * 5.0);
  if (miles <= 8)  return Math.round(miles * 3.2);
  if (miles <= 20) return Math.round(miles * 2.5);
  if (miles <= 60) return Math.round(miles * 1.5);
  return Math.round(miles * 1.1);
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
