import { useState } from 'react';
import { RankedActivity } from '../lib/types';
import { WarningBadge } from './WarningBadge';
import { getActivityDriveMinutes, formatDriveTime, getActivityAreaLabel } from '../lib/distance';
import { ActivityDetailSheet } from './ActivityDetailSheet';

interface Props {
  ranked: RankedActivity;
  rank: number;
  userLocation?: { lat: number; lon: number };
  /** Real routing drive times from OSRM (overrides Haversine when present) */
  driveTimes?: Record<string, number>;
  onVote?: () => void;
  voted?: boolean;
  voteCount?: number;
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
  chill:            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'random-adventure':'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  active:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  creative:         'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  social:           'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
};

const INDOOR_ICON: Record<string, string> = {
  indoor: '🏠', outdoor: '🌿', both: '🌤',
};
const INDOOR_LABEL: Record<string, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor / Outdoor',
};

export function ActivityCard({ ranked, rank, userLocation, driveTimes, onVote, voted, voteCount }: Props) {
  const { activity, rankingReason } = ranked;
  const [showDetail, setShowDetail] = useState(false);

  // Distance label priority:
  // 1. Real OSRM road-routing time (most accurate — actual roads, not straight line)
  // 2. Haversine GPS estimate (good approximation when OSRM hasn't loaded yet)
  // 3. Geographic area name for fixed-location spots (no GPS available)
  // 4. Generic category label for activities with no fixed location
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

  const costLabel =
    activity.estimatedCostMin === 0 && activity.estimatedCostMax === 0
      ? 'Free'
      : activity.estimatedCostMin === 0
      ? `Free – $${activity.estimatedCostMax}/person`
      : `$${activity.estimatedCostMin}–$${activity.estimatedCostMax}/person`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">#{rank}</span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${EFFORT_STYLES[activity.effortLevel]}`}>
          {EFFORT_LABELS[activity.effortLevel]} effort
        </span>
      </div>

      {/* ── Title ── */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{activity.title}</h3>

      {/* ── Summary ── */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{activity.summary}</p>

      {/* ── Detail pills ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-2">
          <span>💰</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{costLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-2">
          <span>⏱</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{activity.timeNeeded}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-2">
          <span>📍</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {distanceLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-2">
          <span>{INDOOR_ICON[activity.indoorOutdoor]}</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {INDOOR_LABEL[activity.indoorOutdoor]}
          </span>
        </div>
      </div>

      {/* ── Best for ── */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-600 dark:text-gray-300">Best for: </span>
        {activity.bestFor}
      </p>

      {/* ── Vibe tags ── */}
      <div className="flex flex-wrap gap-1">
        {activity.vibes.map(vibe => (
          <span
            key={vibe}
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${VIBE_STYLES[vibe] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {vibe.replace('-', ' ')}
          </span>
        ))}
      </div>

      {/* ── Ranking reason ── */}
      <p className="text-xs text-indigo-600 dark:text-indigo-400 italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-2.5">
        {rankingReason}
      </p>

      {/* ── Planning notes ── */}
      {activity.planningNotes && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">📋 Tips: </span>
            {activity.planningNotes}
          </p>
        </div>
      )}

      {/* ── Warning badges ── */}
      {activity.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activity.warnings.map(w => (
            <WarningBadge key={w.type} badge={w} />
          ))}
        </div>
      )}

      {/* ── Action row ── */}
      <div className={`flex gap-2 mt-1 ${onVote ? '' : ''}`}>
        <button
          onClick={() => setShowDetail(true)}
          className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
        >
          More info →
        </button>
        {onVote && (
          <button
            onClick={onVote}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              voted
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-gray-600'
            }`}
          >
            {voted ? `Voted ✓ (${voteCount ?? 0})` : `Vote${voteCount ? ` (${voteCount})` : ''}`}
          </button>
        )}
      </div>

      {/* ── Detail sheet ── */}
      {showDetail && (
        <ActivityDetailSheet
          activity={activity}
          userLocation={userLocation}
          driveTimes={driveTimes}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}
