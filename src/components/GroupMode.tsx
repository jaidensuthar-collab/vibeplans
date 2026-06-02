import { useState, useEffect } from 'react';
import { GroupConstraint, ImprovedPlan } from '../lib/types';
import { parsePromptAI, rankWithConstraints, generateImprovedPlan, UserLocation } from '../lib/mockPlanner';
import { apiCreateGroup, apiGetGroup, apiUpdateGroup, StoredGroup } from '../lib/groupApi';
import { getVoteCounts, getWinningActivityId } from '../lib/groupUtils';
import { RankedActivity } from '../lib/types';
import { VotePanel } from './VotePanel';
import { ImprovedPlanCard } from './ImprovedPlanCard';
import { EmptyState } from './EmptyState';

type Step = 'entry' | 'setup' | 'vote' | 'improved';

interface Props {
  userLocation?: UserLocation;
}

export function GroupMode({ userLocation }: Props) {
  const [step, setStep] = useState<Step>('entry');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  // Entry / create
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState('');

  // Entry / join
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Setup (constraints)
  const [myName, setMyName] = useState('');
  const [myBudget, setMyBudget] = useState('');
  const [myDistance, setMyDistance] = useState('');

  // Shared session state
  const [serverGroup, setServerGroup] = useState<StoredGroup | null>(null);
  const [topActivities, setTopActivities] = useState<RankedActivity[]>([]);
  const [myVote, setMyVote] = useState<string | undefined>();
  const [improvedPlan, setImprovedPlan] = useState<ImprovedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myId] = useState(() => crypto.randomUUID());

  // Auto-fill code from URL: vibeplans.netlify.app/?code=VP-1234
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setJoinCode(urlCode.toUpperCase());
      setMode('join');
    }
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────────────

  function buildTopActivities(sg: StoredGroup): RankedActivity[] {
    return rankWithConstraints(sg.parsedPrompt, sg.constraints, userLocation);
  }

  async function refreshGroup() {
    if (!serverGroup) return;
    setRefreshing(true);
    try {
      const latest = await apiGetGroup(serverGroup.code);
      setServerGroup(latest);
      setTopActivities(buildTopActivities(latest));
    } catch { /* silent */ } finally {
      setRefreshing(false);
    }
  }

  function copyShareLink() {
    if (!serverGroup) return;
    const url = `${window.location.origin}${window.location.pathname}?code=${serverGroup.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── flows ─────────────────────────────────────────────────────────────────

  async function handleCreateGroup() {
    if (!prompt.trim()) { setPromptError('Describe what your group wants to do.'); return; }
    setPromptError('');
    setLoading(true);
    try {
      const parsed = await parsePromptAI(prompt);
      const { code } = await apiCreateGroup(prompt, parsed);
      const sg = await apiGetGroup(code);
      setServerGroup(sg);
      setStep('setup');
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGroup() {
    const code = joinCode.toUpperCase().trim();
    if (!code) { setJoinError('Enter a group code.'); return; }
    setJoinError('');
    setLoading(true);
    try {
      const sg = await apiGetGroup(code);
      setServerGroup(sg);
      setStep('setup');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not find that group.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddConstraintAndVote() {
    if (!serverGroup) return;
    const constraint: GroupConstraint = {
      memberId: myId,
      name: myName.trim() || 'Anonymous',
      maxBudget: myBudget ? parseInt(myBudget) : undefined,
      maxDistanceMinutes: myDistance ? parseInt(myDistance) : undefined,
    };
    setLoading(true);
    try {
      const updated = await apiUpdateGroup(serverGroup.code, { constraint });
      setServerGroup(updated);
      setTopActivities(buildTopActivities(updated));
      setStep('vote');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(activityId: string) {
    if (!serverGroup) return;
    setMyVote(activityId);
    try {
      const updated = await apiUpdateGroup(serverGroup.code, {
        vote: { memberId: myId, activityId },
      });
      setServerGroup(updated);
    } catch { /* optimistic — myVote is already set */ }
  }

  function handleImprovePlan() {
    if (!serverGroup?.winningActivityId) return;
    const winner = topActivities.find(r => r.activity.id === serverGroup.winningActivityId);
    if (!winner) return;
    const plan = generateImprovedPlan(winner, serverGroup.constraints);
    setImprovedPlan(plan);
    setStep('improved');
  }

  function handleReset() {
    setStep('entry');
    setMode('create');
    setServerGroup(null);
    setTopActivities([]);
    setPrompt('');
    setPromptError('');
    setJoinCode('');
    setJoinError('');
    setMyName('');
    setMyBudget('');
    setMyDistance('');
    setMyVote(undefined);
    setImprovedPlan(null);
    // Remove ?code= from URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  // ── derived ──────────────────────────────────────────────────────────────────

  const voteCounts = serverGroup ? getVoteCounts(serverGroup as Parameters<typeof getVoteCounts>[0]) : {};
  const winningId = serverGroup?.winningActivityId;
  const memberCount = serverGroup?.constraints.length ?? 0;
  const voteCount = serverGroup?.votes.length ?? 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Group Mode</h2>

      {/* ── Entry ── */}
      {step === 'entry' && (
        <div className="space-y-5">
          {/* Tab toggle */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'create'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Create Group
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'join'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Join Group
            </button>
          </div>

          {mode === 'create' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Describe what your group wants to do. You'll get a shareable code for everyone to join.
              </p>
              <textarea
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
                placeholder="5 people, bored tonight, random adventure, $20 each, within 25 minutes..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateGroup(); } }}
              />
              {promptError && <p className="text-sm text-red-500">{promptError}</p>}
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </>
                ) : 'Create Group'}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the group code shared with you (e.g. VP-1234).
              </p>
              <input
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 uppercase tracking-widest font-mono"
                placeholder="VP-1234"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleJoinGroup(); }}
                maxLength={7}
              />
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              <button
                onClick={handleJoinGroup}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Joining...
                  </>
                ) : 'Join Group'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Setup (add constraints) ── */}
      {step === 'setup' && serverGroup && (
        <div className="space-y-4">
          {/* Group code + share */}
          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Group code</p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-widest text-center">
              {serverGroup.code}
            </p>
            <button
              onClick={copyShareLink}
              className="mt-2 w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-800/40 hover:bg-indigo-200 dark:hover:bg-indigo-700/40 py-1.5 rounded-lg transition-colors"
            >
              {copied ? '✓ Link copied!' : '🔗 Copy share link'}
            </button>
          </div>

          {/* Group prompt recap */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Planning for</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 italic">"{serverGroup.prompt}"</p>
          </div>

          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your preferences (optional)</p>

          <input
            placeholder="Your name"
            value={myName}
            onChange={e => setMyName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
          />
          <input
            placeholder="Max budget per person ($)"
            type="number"
            min="0"
            value={myBudget}
            onChange={e => setMyBudget(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
          />
          <input
            placeholder="Max drive time (minutes)"
            type="number"
            min="0"
            value={myDistance}
            onChange={e => setMyDistance(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
          />

          <button
            onClick={handleAddConstraintAndVote}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ranking ideas...
              </>
            ) : 'See Ideas & Vote'}
          </button>
        </div>
      )}

      {/* ── Vote ── */}
      {step === 'vote' && serverGroup && (
        <div className="space-y-4">
          {/* Code + share bar */}
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl px-3.5 py-2.5">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Group code</p>
              <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tracking-widest">
                {serverGroup.code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {memberCount} joined · {voteCount} voted
              </span>
              <button
                onClick={copyShareLink}
                className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-800/40 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied ? '✓' : '🔗 Share'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Vote for your favourite idea.</p>
            <button
              onClick={refreshGroup}
              disabled={refreshing}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh votes'}
            </button>
          </div>

          {topActivities.length === 0 ? (
            <EmptyState
              message="No ideas matched those constraints."
              hint="Try loosening the budget or distance limit."
            />
          ) : (
            <VotePanel
              activities={topActivities}
              voteCounts={voteCounts}
              userVote={myVote}
              winningId={winningId}
              onVote={handleVote}
              userLocation={userLocation}
            />
          )}

          {winningId && (
            <button
              onClick={handleImprovePlan}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              ✨ Improve Winning Plan
            </button>
          )}

          <button
            onClick={handleReset}
            className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* ── Improved plan ── */}
      {step === 'improved' && improvedPlan && (
        <div className="space-y-4">
          <ImprovedPlanCard plan={improvedPlan} />
          <button
            onClick={handleReset}
            className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}
    </main>
  );
}
