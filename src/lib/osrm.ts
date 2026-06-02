import { ACTIVITY_LOCATIONS } from '../data/activity-locations';

/**
 * Fetches real road-routing drive times from the user's GPS location to each
 * activity that has fixed coordinates, using OSRM (OpenStreetMap Routing Machine).
 *
 * Results are more accurate than Haversine straight-line estimates because they
 * follow actual roads. Silently falls back to Haversine (empty return) on error.
 *
 * @returns Record<activityId, driveMinutes> — only includes activities with coords
 */
export async function fetchDriveTimes(
  userLat: number,
  userLon: number,
  activityIds: string[]
): Promise<Record<string, number>> {
  const fixed = activityIds.filter(id => id in ACTIVITY_LOCATIONS);
  if (fixed.length === 0) return {};

  // Build coordinate string: user first (index 0), then each activity location
  const coords = [
    `${userLon},${userLat}`,
    ...fixed.map(id => {
      const loc = ACTIVITY_LOCATIONS[id];
      return `${loc.lon},${loc.lat}`;
    }),
  ].join(';');

  // sources=0 means "from index 0 (user) to all others"
  const url =
    `https://router.project-osrm.org/table/v1/driving/${coords}` +
    `?sources=0&annotations=duration`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok') throw new Error(`OSRM code: ${data.code}`);

    // data.durations[0] = [user→user=0, user→activity0, user→activity1, ...]
    const row: (number | null)[] = data.durations[0];
    const result: Record<string, number> = {};

    fixed.forEach((id, i) => {
      const secs = row[i + 1]; // +1 because row[0] is user→user = 0
      if (secs != null) result[id] = Math.round(secs / 60);
    });

    return result;
  } catch {
    // Network error, timeout, or OSRM unavailable — caller falls back to Haversine
    return {};
  } finally {
    clearTimeout(timeout);
  }
}
