import { useState } from 'react';
import { Group, GroupConstraint, ImprovedPlan } from '../lib/types';
import { createGroup, addVote, getVoteCounts, getWinningActivityId } from '../lib/groupUtils';
import { rankWithConstraints, generateImprovedPlan } from '../lib/mockPlanner';
import { VotePanel } from './VotePanel';
import { ImprovedPlanCard } from './ImprovedPlanCard';
import { EmptyState } from './EmptyState';

type Step = 'entry' | 'setup' | 'vote' | 'improved';

export function GroupMode() {
  const [step, setStep] = useState<Step>('entry');
  const [group, setGroup] = useState<Group | null>(null);
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState('');
  const [myName, setMyName] = useState('');
  const [myBudget, setMyBudget] = useState('');
  const [myDistance, setMyDistance] = useState('');
  const [improvedPlan, setImprovedPlan] = useState<ImprovedPlan | null>(null);
  const [myId] = useState(() => crypto.randomUUID());

  function handleCreateGroup() {
    if (!prompt.trim()) { setPromptError('Enter a prompt for your group.'); return; }
    setPromptError('');
    const g = createGroup(prompt);
    setGroup(g);
    setStep('setup');
  }

  function handleAddConstraintAndVote() {
    if (!group) return;
    const constraint: GroupConstraint = {
      memberId: myId,
      name: myName || 'Me',
      maxBudget: myBudget ? parseInt(myBudget) : undefined,
      maxDistanceMinutes: myDistance ? parseInt(myDistance) : undefined,
    };
    const updatedConstraints = [
      ...group.constraints.filter(c => c.memberId !== myId),
      constraint,
    ];
    const topActivities = rankWithConstraints(group.prompt, updatedConstraints);
    const updated: Group = { ...group, constraints: updatedConstraints, topActivities };
    setGroup(updated);
    setStep('vote');
  }

  function handleVote(activityId: string) {
    if (!group) return;
    const withVote = addVote(group, myId, activityId);
    const winningActivityId = getWinningActivityId(withVote);
    setGroup({ ...withVote, winningActivityId });
  }

  function handleImprovePlan() {
    if (!group?.winningActivityId) return;
    const winner = group.topActivities.find(r => r.activity.id === group.winningActivityId);
    if (!winner) return;
    const plan = generateImprovedPlan(winner, group.constraints);
    setImprovedPlan(plan);
    setStep('improved');
  }

  function handleReset() {
    setStep('entry');
    setGroup(null);
    setPrompt('');
    setPromptError('');
    setMyName('');
    setMyBudget('');
    setMyDistance('');
    setImprovedPlan(null);
  }

  const voteCounts = group ? getVoteCounts(group) : {};

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Group Mode</h2>

      {step === 'entry' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Describe your group's vibe, set constraints, and vote on the best plan together.
          </p>
          <textarea
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
            rows={2}
            placeholder="5 people, bored tonight, random adventure, $20 each, within 25 minutes..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          {promptError && <p className="text-sm text-red-500">{promptError}</p>}
          <button
            onClick={handleCreateGroup}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            Create Group
          </button>
        </div>
      )}

      {step === 'setup' && group && (
        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-4 text-center border border-indigo-200 dark:border-indigo-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your group code</p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-widest">{group.code}</p>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Add your constraints (optional)</p>
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
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            See Top Ideas & Vote
          </button>
        </div>
      )}

      {step === 'vote' && group && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vote for the plan you like best. The winner will be highlighted.
          </p>
          {group.topActivities.length === 0 ? (
            <EmptyState
              message="No ideas matched those constraints."
              hint="Try loosening the budget or distance limit."
            />
          ) : (
            <VotePanel
              activities={group.topActivities}
              voteCounts={voteCounts}
              userVote={group.votes.find(v => v.memberId === myId)?.activityId}
              winningId={group.winningActivityId}
              onVote={handleVote}
            />
          )}
          {group.winningActivityId && (
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
