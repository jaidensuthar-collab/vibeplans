import { ImprovedPlan } from '../lib/types';

interface Props {
  plan: ImprovedPlan;
}

export function ImprovedPlanCard({ plan }: Props) {
  return (
    <div className="rounded-2xl border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 p-5 space-y-4">
      <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
        Improved Plan: {plan.activityTitle}
      </h4>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Polished Plan
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{plan.polishedPlan}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Nearby Options
        </p>
        <ul className="space-y-1">
          {plan.nearbyOptions.map(o => (
            <li key={o} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Backup Plan
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{plan.backupPlan}</p>
      </div>
    </div>
  );
}
