import { activities } from '../data/activities';
import { Activity, ParsedPrompt, RankedActivity, Vibe, GroupConstraint, ImprovedPlan } from './types';

const BUDGET_KEYWORDS: Record<string, number> = {
  free: 0, cheap: 10, low: 10, broke: 5, '$5': 5, '$10': 10,
  '$15': 15, '$20': 20, '$25': 25, '$30': 30, '$50': 50,
};

const VIBE_KEYWORDS: Record<string, Vibe> = {
  chill: 'chill', relax: 'chill', lowkey: 'chill', calm: 'chill', easy: 'chill',
  random: 'random-adventure', adventure: 'random-adventure', spontaneous: 'random-adventure',
  active: 'active', sporty: 'active', energetic: 'active',
  creative: 'creative', artsy: 'creative',
  social: 'social', hangout: 'social',
};

const DISTANCE_KEYWORDS: Record<string, number> = {
  walking: 5, nearby: 10, close: 10, '10 min': 10, '15 min': 15,
  '20 min': 20, '25 min': 25, '30 min': 30,
};

export function parsePrompt(raw: string): ParsedPrompt {
  const lower = raw.toLowerCase();
  let budget: number | undefined;
  let distanceMinutes: number | undefined;
  const vibes: Vibe[] = [];

  const dollarMatch = lower.match(/\$(\d+)/g);
  if (dollarMatch) budget = Math.max(...dollarMatch.map(d => parseInt(d.replace('$', ''))));

  for (const [kw, val] of Object.entries(BUDGET_KEYWORDS)) {
    if (lower.includes(kw) && budget === undefined) budget = val;
  }

  const minMatch = lower.match(/(\d+)\s*min/);
  if (minMatch) distanceMinutes = parseInt(minMatch[1]);
  for (const [kw, val] of Object.entries(DISTANCE_KEYWORDS)) {
    if (lower.includes(kw) && distanceMinutes === undefined) distanceMinutes = val;
  }

  for (const [kw, vibe] of Object.entries(VIBE_KEYWORDS)) {
    if (lower.includes(kw) && !vibes.includes(vibe)) vibes.push(vibe);
  }

  const groupMatch = lower.match(/(\d+)\s*people/);
  const groupSize = groupMatch ? parseInt(groupMatch[1]) : undefined;

  return { budget, distanceMinutes, vibes, groupSize, rawText: raw };
}

function distanceScore(activity: Activity, maxMinutes?: number): number {
  const distanceOrder: Record<string, number> = {
    walking: 5, nearby: 10, 'short-drive': 25, 'road-trip': 60,
  };
  const activityMinutes = distanceOrder[activity.distanceType];
  if (maxMinutes === undefined) return 10;
  if (activityMinutes <= maxMinutes) return 15;
  if (activityMinutes <= maxMinutes * 1.3) return 5;
  return -15;
}

function budgetScore(activity: Activity, budget?: number): number {
  if (budget === undefined) return 10;
  if (activity.estimatedCostMax <= budget) return 20;
  if (activity.estimatedCostMin <= budget) return 5;
  return -20;
}

function vibeScore(activity: Activity, vibes: Vibe[]): number {
  if (vibes.length === 0) return 10;
  const matches = vibes.filter(v => activity.vibes.includes(v)).length;
  return matches * 15;
}

function warningPenalty(activity: Activity): number {
  return activity.warnings.length * -3;
}

export function rankActivities(prompt: ParsedPrompt, pool: Activity[] = activities): RankedActivity[] {
  const scored = pool.map(activity => {
    const score =
      50 +
      budgetScore(activity, prompt.budget) +
      distanceScore(activity, prompt.distanceMinutes) +
      vibeScore(activity, prompt.vibes) +
      warningPenalty(activity);

    const reasons: string[] = [];
    if (prompt.budget !== undefined && activity.estimatedCostMax <= prompt.budget)
      reasons.push(`fits your $${prompt.budget} budget`);
    if (prompt.distanceMinutes !== undefined) {
      const order: Record<string, number> = {
        walking: 5, nearby: 10, 'short-drive': 25, 'road-trip': 60,
      };
      if (order[activity.distanceType] <= prompt.distanceMinutes)
        reasons.push('within your drive limit');
    }
    const matchedVibes = prompt.vibes.filter(v => activity.vibes.includes(v));
    if (matchedVibes.length > 0) reasons.push(`matches ${matchedVibes.join(', ')} vibe`);
    if (activity.effortLevel === 'low') reasons.push('easy to coordinate');
    if (reasons.length === 0) reasons.push('solid all-around option');

    return {
      activity,
      score,
      rankingReason: `Ranked because it ${reasons.join(', ')}.`,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function rankWithConstraints(rawPrompt: string, constraints: GroupConstraint[]): RankedActivity[] {
  const base = parsePrompt(rawPrompt);
  const budgets = constraints.map(c => c.maxBudget).filter((b): b is number => b !== undefined);
  const distances = constraints.map(c => c.maxDistanceMinutes).filter((d): d is number => d !== undefined);
  const merged: ParsedPrompt = {
    ...base,
    budget: budgets.length > 0 ? Math.min(...budgets, base.budget ?? Infinity) : base.budget,
    distanceMinutes: distances.length > 0
      ? Math.min(...distances, base.distanceMinutes ?? Infinity)
      : base.distanceMinutes,
  };
  return rankActivities(merged);
}

export function generateImprovedPlan(ranked: RankedActivity, constraints: GroupConstraint[]): ImprovedPlan {
  const { activity } = ranked;
  const minBudgets = constraints.map(c => c.maxBudget).filter((b): b is number => b !== undefined);
  const budgetNote = minBudgets.length > 0
    ? `under $${Math.min(...minBudgets)} per person`
    : `around $${activity.estimatedCostMax} per person`;

  return {
    activityTitle: activity.title,
    polishedPlan: `Meet up and head out for ${activity.title.toLowerCase()}. Keep costs ${budgetNote} and stay within ${activity.distanceType === 'nearby' ? '15 minutes' : '25 minutes'} of your starting point. Plan for ${activity.timeNeeded} and keep it low-key — ${activity.summary.toLowerCase()}`,
    nearbyOptions: [
      'Local park or green space',
      'Nearby shopping center or strip',
      'Scenic outdoor spot or overlook',
    ],
    backupPlan: activity.indoorOutdoor === 'outdoor'
      ? 'If weather turns bad, switch to a coffee shop, board game night, or car playlist drive instead.'
      : 'If the main spot is full or closed, pick the next closest option on the list.',
  };
}
