import { RankedActivity } from '../lib/types';
import { WarningBadge } from './WarningBadge';

interface Props {
  ranked: RankedActivity;
  rank: number;
  onVote?: () => void;
  voted?: boolean;
  voteCount?: number;
}

export function ActivityCard({ ranked, rank, onVote, voted, voteCount }: Props) {
  const { activity, rankingReason } = ranked;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">#{rank}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{activity.effortLevel} effort</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activity.title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{activity.summary}</p>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
        <span>💰 ${activity.estimatedCostMin}–${activity.estimatedCostMax}/person</span>
        <span>⏱ {activity.timeNeeded}</span>
        <span>📍 {activity.distanceType}</span>
        <span>🏷 {activity.bestFor}</span>
      </div>
      <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">{rankingReason}</p>
      {activity.warnings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activity.warnings.map(w => (
            <WarningBadge key={w.type} badge={w} />
          ))}
        </div>
      )}
      {onVote && (
        <button
          onClick={onVote}
          className={`w-full mt-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
            voted
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-gray-600'
          }`}
        >
          {voted ? `Voted ✓ (${voteCount ?? 0})` : `Vote${voteCount ? ` (${voteCount})` : ''}`}
        </button>
      )}
    </div>
  );
}
