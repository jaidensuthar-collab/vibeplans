import { useState } from 'react';
import { ParsedPrompt, RankedActivity } from '../lib/types';
import { parsePromptAI, rankActivities, UserLocation } from '../lib/mockPlanner';
import { ActivityCard } from './ActivityCard';
import { EmptyState } from './EmptyState';

const SUGGESTION_CHIPS = [
  'Bored tonight, 5 people, $15 each, within 20 minutes',
  'Something chill with friends this afternoon',
  'Active outdoor adventure, willing to drive',
  'Something cheap and close by',
];

interface Props {
  userLocation?: UserLocation;
}

// ── "I understood" chip row ──────────────────────────────────────────────────

const VIBE_COLORS: Record<string, string> = {
  chill:              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'random-adventure': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  active:             'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  creative:           'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  social:             'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
};

function ParsedSummary({ p }: { p: ParsedPrompt }) {
  const chips: { label: string; color: string }[] = [];

  p.vibes.forEach(v =>
    chips.push({ label: v.replace('-', ' '), color: VIBE_COLORS[v] ?? 'bg-gray-100 text-gray-700' })
  );
  if (p.distanceMinutes !== undefined)
    chips.push({ label: `📍 within ${p.distanceMinutes} min`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' });
  if (p.budget !== undefined)
    chips.push({ label: `💰 under $${p.budget}`, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' });
  if (p.effortLevel)
    chips.push({ label: `⚡ ${p.effortLevel} effort`, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' });
  if (p.indoorOutdoor)
    chips.push({ label: `${p.indoorOutdoor === 'indoor' ? '🏠' : '🌿'} ${p.indoorOutdoor}`, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' });
  if (p.groupSize)
    chips.push({ label: `👥 ${p.groupSize} people`, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' });

  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">I understood</p>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={i} className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${c.color}`}>
              {c.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          Nothing specific detected — try mentioning a vibe (chill, active, social), a budget, or how far you want to drive.
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatMode({ userLocation }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<RankedActivity[]>([]);
  const [parsed, setParsed] = useState<ParsedPrompt | null>(null);
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
      const parsedPrompt = await parsePromptAI(trimmed);
      const ranked = rankActivities(parsedPrompt, undefined, 5, userLocation);
      setParsed(parsedPrompt);
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
          Describe what you want — vibe, budget, how far you'll drive, how many people.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
          rows={3}
          placeholder="e.g. Something chill close by, 3 people, under $20 each..."
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

      {/* ── Parsed understanding ── */}
      {submitted && !loading && parsed && <ParsedSummary p={parsed} />}

      {submitted && !loading && results.length === 0 && (
        <EmptyState
          message="No ideas matched those constraints."
          hint="Try loosening the budget or distance limit."
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
