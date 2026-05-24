import { describe, it, expect } from 'vitest';
import { generateGroupCode, createGroup, addVote, getVoteCounts, getWinningActivityId } from '../src/lib/groupUtils';

describe('generateGroupCode', () => {
  it('matches VP-XXXX format', () => {
    expect(generateGroupCode()).toMatch(/^VP-\d{4}$/);
  });
});

describe('createGroup', () => {
  it('creates group with a code and empty votes', () => {
    const g = createGroup('fun tonight');
    expect(g.code).toMatch(/^VP-/);
    expect(g.votes).toHaveLength(0);
  });
});

describe('addVote', () => {
  it('adds a vote', () => {
    const g = createGroup('test');
    const updated = addVote(g, 'user1', 'park-picnic');
    expect(updated.votes).toHaveLength(1);
  });
  it('replaces existing vote from same member', () => {
    let g = createGroup('test');
    g = addVote(g, 'user1', 'park-picnic');
    g = addVote(g, 'user1', 'bowling');
    expect(g.votes).toHaveLength(1);
    expect(g.votes[0].activityId).toBe('bowling');
  });
});

describe('getVoteCounts', () => {
  it('counts votes per activity', () => {
    let g = createGroup('test');
    g = addVote(g, 'u1', 'bowling');
    g = addVote(g, 'u2', 'bowling');
    const counts = getVoteCounts(g);
    expect(counts['bowling']).toBe(2);
  });
});

describe('getWinningActivityId', () => {
  it('returns the activity with most votes', () => {
    let g = createGroup('test');
    g = addVote(g, 'u1', 'bowling');
    g = addVote(g, 'u2', 'bowling');
    g = addVote(g, 'u3', 'park-picnic');
    expect(getWinningActivityId(g)).toBe('bowling');
  });
  it('returns undefined when no votes', () => {
    const g = createGroup('test');
    expect(getWinningActivityId(g)).toBeUndefined();
  });
});
