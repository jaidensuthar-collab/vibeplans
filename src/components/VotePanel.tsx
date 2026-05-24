import { RankedActivity } from '../lib/types';
import { ActivityCard } from './ActivityCard';

interface Props {
  activities: RankedActivity[];
  voteCounts: Record<string, number>;
  userVote?: string;
  winningId?: string;
  onVote: (activityId: string) => void;
}

export function VotePanel({ activities, voteCounts, userVote, winningId, onVote }: Props) {
  return (
    <div className="space-y-4">
      {activities.map((r, i) => (
        <div
          key={r.activity.id}
          className={`transition-all ${winningId === r.activity.id ? 'ring-2 ring-indigo-500 rounded-2xl' : ''}`}
        >
          {winningId === r.activity.id && (
            <div className="text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              👑 Winner
            </div>
          )}
          <ActivityCard
            ranked={r}
            rank={i + 1}
            onVote={() => onVote(r.activity.id)}
            voted={userVote === r.activity.id}
            voteCount={voteCounts[r.activity.id] ?? 0}
          />
        </div>
      ))}
    </div>
  );
}
