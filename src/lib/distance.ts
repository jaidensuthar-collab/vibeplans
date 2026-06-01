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
 * Calibrated against real Google Maps times across multiple Austin-area starting points.
 */
export function milesToDriveMinutes(miles: number): number {
  if (miles <= 2)  return Math.round(miles * 5.0);  // local streets ~12 mph
  if (miles <= 8)  return Math.round(miles * 3.2);  // mixed city   ~19 mph
  if (miles <= 20) return Math.round(miles * 2.5);  // city + hwy   ~24 mph
  if (miles <= 60) return Math.round(miles * 1.5);  // highway      ~40 mph
  return Math.round(miles * 1.1);                   // open highway ~55 mph
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

/**
 * Returns a human-readable geographic area name for a fixed-location activity,
 * based on its GPS coordinates. Used when GPS is unavailable so we show an
 * honest location label instead of a fake "5-15 min away" distance estimate.
 * Returns null for generic activities without fixed coordinates.
 */
export function getActivityAreaLabel(activityId: string): string | null {
  const loc = ACTIVITY_LOCATIONS[activityId];
  if (!loc) return null;

  const { lat, lon } = loc;

  // Far Texas / out-of-Austin day trips
  if (lon < -100)                               return 'Far West Texas';
  if (lon < -99.5)                              return 'West Texas';
  if (lon < -99)                                return 'Hill Country (far)';
  if (lat < 29.5)                               return 'South Texas';
  if (lon < -98.8 || lat > 31.5)               return 'Hill Country day trip';
  if (lon < -98.5)                              return 'Hill Country';
  if (lat < 29.75)                              return 'San Marcos / NB area';

  // San Antonio (south of Austin metro)
  if (lat < 29.55)                              return 'San Antonio area';

  // Austin metro geographic zones
  if (lon < -97.95 && lat > 30.33)             return 'Lake Travis area';
  if (lon < -97.95)                             return 'Far West Austin';
  if (lon < -97.85 && lat > 30.28)             return 'Steiner Ranch / Lake Austin';
  if (lon < -97.85)                             return 'Southwest Austin';
  if (lat > 30.55)                              return 'Georgetown / Round Rock';
  if (lat > 30.45)                              return 'North Austin / Pflugerville';
  if (lat > 30.32 && lon > -97.80)             return 'North Austin';
  if (lat > 30.32)                              return 'Northwest Austin';
  if (lat < 30.15)                              return 'South Austin (far)';
  if (lat < 30.23)                              return 'South Austin';
  if (lon > -97.70)                             return 'East Austin';
  if (lon < -97.76 && lat > 30.26)             return 'West / Central Austin';
  return 'Downtown Austin';
}
