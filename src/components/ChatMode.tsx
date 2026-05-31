import { useState } from 'react';
import { RankedActivity } from '../lib/types';
import { parsePromptAI, rankActivities, UserLocation } from '../lib/mockPlanner';
import { ActivityCard } from './ActivityCard';
import { EmptyState } from './EmptyState';

const SUGGESTION_CHIPS = [
  'Bored tonight, 5 people, $15 each, within 20 minutes',
  'Something chill with friends this afternoon',
  'Random adventure, no idea where, cheap',
];

interface Props {
  userLocation?: UserLocation;
}

export function ChatMode({ userLocation }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<RankedActivity[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Type something so VibePlan can rank ideas for you.');
      return;
    }
    if (trimmed.length < 5) {
      setError("Add a little more detail — try mentioning a budget, vibe, or how far you'll drive.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const parsed = await parsePromptAI(trimmed);
      const ranked = rankActivities(parsed, undefined, 5, userLocation);
      setResults(ranked);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chat Mode</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tell VibePlan what you're feeling. Mention your budget, how far you'll drive, and the vibe.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
          rows={3}
          placeholder="We're bored tonight, 5 people, $15 each, nothing more than 20 minutes away..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setInput(chip)}
              className="text-xs bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Finding ideas...
            </>
          ) : (
            'Find Ideas'
          )}
        </button>
      </div>

      {submitted && !loading && results.length === 0 && (
        <EmptyState
          message="No ideas matched those constraints."
          hint="Try adding a budget, vibe, or drive limit."
        />
      )}

      {results.length > 0 && !loading && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Top Ideas</h3>
          {results.map((r, i) => (
            <ActivityCard key={r.activity.id} ranked={r} rank={i + 1} userLocation={userLocation} />
          ))}
          <p className="text-xs text-center text-gray-400 dark:text-gray-600 pb-4">
            Powered by GPT-4o-mini
          </p>
        </section>
      )}
    </main>
  );
}
