import { useState } from 'react';
import { RankedActivity } from '../lib/types';
import { parsePrompt, rankActivities } from '../lib/mockPlanner';
import { ActivityCard } from './ActivityCard';
import { EmptyState } from './EmptyState';

const SUGGESTION_CHIPS = [
  'Bored tonight, 5 people, $15 each, within 20 minutes',
  'Something chill with friends this afternoon',
  'Random adventure, no idea where, cheap',
];

export function ChatMode() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<RankedActivity[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Type something so VibePlan can rank ideas for you.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Add a little more detail — try mentioning a budget, vibe, or how far you\'ll drive.');
      return;
    }
    setError('');
    const ranked = rankActivities(parsePrompt(trimmed));
    setResults(ranked);
    setSubmitted(true);
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
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors"
        >
          Find Ideas
        </button>
      </div>

      {submitted && results.length === 0 && (
        <EmptyState
          message="No ideas matched those constraints."
          hint="Try adding a budget, vibe, or drive limit."
        />
      )}

      {results.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Top 3 Ideas</h3>
          {results.map((r, i) => (
            <ActivityCard key={r.activity.id} ranked={r} rank={i + 1} />
          ))}
          <p className="text-xs text-center text-gray-400 dark:text-gray-600 pb-4">
            Powered by mock AI — OpenAI integration coming in Phase 3
          </p>
        </section>
      )}
    </main>
  );
}
