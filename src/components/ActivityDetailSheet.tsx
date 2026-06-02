import { useEffect } from 'react';
import { Activity } from '../lib/types';
import { ACTIVITY_LOCATIONS } from '../data/activity-locations';
import { ACTIVITY_VENUE_DETAILS } from '../data/activity-details';
import { getActivityDriveMinutes, formatDriveTime, getActivityAreaLabel } from '../lib/distance';
import { WarningBadge } from './WarningBadge';

interface Props {
  activity: Activity;
  userLocation?: { lat: number; lon: number };
  /** Real routing drive times from OSRM (overrides Haversine when present) */
  driveTimes?: Record<string, number>;
  onClose: () => void;
}

const DISTANCE_LABELS: Record<string, string> = {
  walking:      'Walking distance',
  nearby:       '5–15 min away',
  'short-drive':'20–45 min drive',
  'road-trip':  '1+ hr road trip',
};

const EFFORT_STYLES: Record<string, string> = {
  low:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Easy', medium: 'Moderate', high: 'Intense',
};

const VIBE_STYLES: Record<string, string> = {
  chill:             'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'random-adventure':'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  active:            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  creative:          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  social:            'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
};

const INDOOR_ICON: Record<string, string> = {
  indoor: '🏠', outdoor: '🌿', both: '🌤',
};
const INDOOR_LABEL: Record<string, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor / Outdoor',
};

export function ActivityDetailSheet({ activity, userLocation, driveTimes, onClose }: Props) {
  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const loc = ACTIVITY_LOCATIONS[activity.id];
  const venueInfo = ACTIVITY_VENUE_DETAILS[activity.id];

  const distanceLabel = (() => {
    if (driveTimes && driveTimes[activity.id] !== undefined)
      return formatDriveTime(driveTimes[activity.id]);
    if (userLocation) {
      const mins = getActivityDriveMinutes(activity.id, userLocation.lat, userLocation.lon);
      if (mins !== null) return formatDriveTime(mins);
    }
    const area = getActivityAreaLabel(activity.id);
    if (area) return area;
    return DISTANCE_LABELS[activity.distanceType] ?? activity.distanceType;
  })();

  // Build Google Maps URL: directions if we have user location, otherwise just show the spot
  const mapsUrl = loc
    ? userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lon}&destination=${loc.lat},${loc.lon}`
      : `https://maps.google.com/?q=${loc.lat},${loc.lon}`
    : null;

  const costLabel =
    activity.estimatedCostMin === 0 && activity.estimatedCostMax === 0
      ? 'Free'
      : activity.estimatedCostMin === 0
      ? `Free – $${activity.estimatedCostMax}/person`
      : `$${activity.estimatedCostMin}–$${activity.estimatedCostMax}/person`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={activity.title}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none font-light transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="px-5 pt-2 pb-10 space-y-5">

          {/* ── Effort badge + title ── */}
          <div className="space-y-1.5">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${EFFORT_STYLES[activity.effortLevel]}`}>
              {EFFORT_LABELS[activity.effortLevel]} effort
            </span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {activity.title}
            </h2>
          </div>

          {/* ── Vibe tags ── */}
          <div className="flex flex-wrap gap-1.5">
            {activity.vibes.map(vibe => (
              <span
                key={vibe}
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${VIBE_STYLES[vibe] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {vibe.replace('-', ' ')}
              </span>
            ))}
          </div>

          {/* ── What to do ── */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              What to do
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {activity.summary}
            </p>
            {activity.planningNotes && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {activity.planningNotes}
              </p>
            )}
          </section>

          {/* ── Venue info (address, hours, phone) ── */}
          {venueInfo && (
            <section className="rounded-2xl bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
              {venueInfo.address && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base mt-0.5">📍</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">{venueInfo.address}</p>
                  </div>
                </div>
              )}
              {venueInfo.hours && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base mt-0.5">🕐</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hours</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">{venueInfo.hours}</p>
                  </div>
                </div>
              )}
              {venueInfo.admission && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base mt-0.5">🎟</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Admission</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">{venueInfo.admission}</p>
                  </div>
                </div>
              )}
              {venueInfo.phone && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base mt-0.5">📞</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                    <a href={`tel:${venueInfo.phone}`} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {venueInfo.phone}
                    </a>
                  </div>
                </div>
              )}
              {venueInfo.website && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base mt-0.5">🌐</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Website</p>
                    <a
                      href={venueInfo.website.startsWith('http') ? venueInfo.website : `https://${venueInfo.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 font-medium break-all"
                    >
                      {venueInfo.website}
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Detail chips ── */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span>💰</span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Cost</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{costLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span>⏱</span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Time</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{activity.timeNeeded}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span>📍</span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Location</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{distanceLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <span>{INDOOR_ICON[activity.indoorOutdoor]}</span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Setting</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{INDOOR_LABEL[activity.indoorOutdoor]}</p>
              </div>
            </div>
          </div>

          {/* ── Best for ── */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Best for: </span>
            {activity.bestFor}
          </p>

          {/* ── Warnings ── */}
          {activity.warnings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activity.warnings.map(w => (
                <WarningBadge key={w.type} badge={w} />
              ))}
            </div>
          )}

          {/* ── Get Directions / Open in Maps ── */}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-2xl transition-colors text-sm"
            >
              <span>🗺</span>
              {userLocation ? 'Get Directions' : 'View on Maps'}
            </a>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                📍 Find any local spot — search{' '}
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  "{activity.title.toLowerCase()}" near me
                </span>{' '}
                in Google Maps.
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
