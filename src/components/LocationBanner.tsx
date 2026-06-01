import { GeoState } from '../hooks/useGeolocation';

interface Props {
  geo: GeoState;
  onAllow: () => void;
}

export function LocationBanner({ geo, onAllow }: Props) {
  // Show a green "active" strip when GPS is working
  if (geo.status === 'granted') {
    return (
      <div className="max-w-md mx-auto px-4 pt-3">
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3.5 py-2">
          <span className="text-base leading-none">📍</span>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Using your location — drive times are real
          </p>
        </div>
      </div>
    );
  }

  // Nothing useful to show for denied / unavailable
  if (geo.status === 'denied' || geo.status === 'unavailable') {
    return null;
  }

  // idle or loading — prompt the user
  return (
    <div className="max-w-md mx-auto px-4 pt-3">
      <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl px-3.5 py-2.5">
        <span className="text-xl leading-none">📍</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">
            See real drive times from you
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-snug">
            Allow location for accurate distances based on where you are.
          </p>
        </div>
        <button
          onClick={onAllow}
          disabled={geo.status === 'loading'}
          className="shrink-0 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {geo.status === 'loading' ? (
            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Allow'
          )}
        </button>
      </div>
    </div>
  );
}
