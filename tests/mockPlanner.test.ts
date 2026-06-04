import { describe, it, expect } from 'vitest';
import { parsePrompt, rankActivities } from '../src/lib/mockPlanner';
import { activities } from '../src/data/activities';

describe('parsePrompt', () => {
  it('extracts budget from dollar amount', () => {
    const p = parsePrompt('We have $15 each');
    expect(p.budget).toBe(15);
  });
  it('extracts distance from minutes', () => {
    const p = parsePrompt('no more than 20 min away');
    expect(p.distanceMinutes).toBe(20);
  });
  it('extracts chill vibe', () => {
    const p = parsePrompt('something chill tonight');
    expect(p.vibes).toContain('chill');
  });
  it('returns empty vibes if none found', () => {
    const p = parsePrompt('ideas please');
    expect(p.vibes).toHaveLength(0);
  });
});

describe('rankActivities', () => {
  it('returns exactly 3 results', () => {
    const results = rankActivities({ vibes: [], rawText: 'anything' }, activities, 3);
    expect(results).toHaveLength(3);
  });
  it('prefers free/cheap activities when budget is $5', () => {
    const results = rankActivities({ budget: 5, vibes: [], rawText: 'free stuff' }, activities);
    expect(results[0].activity.estimatedCostMin).toBeLessThanOrEqual(5);
  });
  it('top result has a rankingReason string', () => {
    const results = rankActivities({ vibes: ['chill'], rawText: 'chill night' }, activities);
    expect(results[0].rankingReason).toBeTruthy();
  });
  it('promotes chill-tagged activities when vibe is chill', () => {
    const results = rankActivities({ vibes: ['chill'], rawText: 'chill vibe' }, activities);
    expect(results[0].activity.vibes).toContain('chill');
  });
});
