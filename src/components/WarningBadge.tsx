import { WarningBadge as WB } from '../lib/types';

const COLORS: Record<string, string> = {
  'late-night': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'needs-ride': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'cost-risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'weather-risk': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'far-drive': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'planning-needed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const LABELS: Record<string, string> = {
  'late-night':      '🌙 Late Night',
  'needs-ride':      '🚗 Needs Ride',
  'cost-risk':       '💸 Cost Risk',
  'weather-risk':    '🌧 Weather Risk',
  'far-drive':       '🛣 Far Drive',
  'planning-needed': '📅 Plan Ahead',
};

export function WarningBadge({ badge }: { badge: WB }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${COLORS[badge.type]}`}
      title={badge.reason}
    >
      {LABELS[badge.type]}
    </span>
  );
}
