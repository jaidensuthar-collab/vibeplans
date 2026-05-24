import { Group, Vote } from './types';

export function generateGroupCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `VP-${num}`;
}

export function createGroup(prompt: string): Group {
  return {
    id: crypto.randomUUID(),
    code: generateGroupCode(),
    prompt,
    constraints: [],
    topActivities: [],
    votes: [],
  };
}

export function addVote(group: Group, memberId: string, activityId: string): Group {
  const filtered = group.votes.filter((v: Vote) => v.memberId !== memberId);
  return { ...group, votes: [...filtered, { memberId, activityId }] };
}

export function getVoteCounts(group: Group): Record<string, number> {
  return group.votes.reduce<Record<string, number>>((acc, vote) => {
    acc[vote.activityId] = (acc[vote.activityId] ?? 0) + 1;
    return acc;
  }, {});
}

export function getWinningActivityId(group: Group): string | undefined {
  const counts = getVoteCounts(group);
  const entries = Object.entries(counts);
  if (entries.length === 0) return undefined;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
