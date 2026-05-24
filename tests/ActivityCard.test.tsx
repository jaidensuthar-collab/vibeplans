import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityCard } from '../src/components/ActivityCard';
import { activities } from '../src/data/activities';

const ranked = { activity: activities[0], score: 75, rankingReason: 'Good match.' };

describe('ActivityCard', () => {
  it('renders activity title', () => {
    render(<ActivityCard ranked={ranked} rank={1} />);
    expect(screen.getByText(activities[0].title)).toBeTruthy();
  });

  it('renders rank number', () => {
    render(<ActivityCard ranked={ranked} rank={1} />);
    expect(screen.getByText('#1')).toBeTruthy();
  });

  it('renders ranking reason', () => {
    render(<ActivityCard ranked={ranked} rank={1} />);
    expect(screen.getByText('Good match.')).toBeTruthy();
  });

  it('calls onVote when Vote button clicked', async () => {
    const fn = vi.fn();
    render(<ActivityCard ranked={ranked} rank={1} onVote={fn} />);
    await userEvent.click(screen.getByRole('button', { name: /vote/i }));
    expect(fn).toHaveBeenCalled();
  });

  it('shows voted state with count', () => {
    render(<ActivityCard ranked={ranked} rank={1} onVote={() => {}} voted voteCount={2} />);
    expect(screen.getByText(/voted/i)).toBeTruthy();
    expect(screen.getByText(/2/)).toBeTruthy();
  });

  it('does not render vote button when onVote not provided', () => {
    render(<ActivityCard ranked={ranked} rank={1} />);
    expect(screen.queryByRole('button', { name: /vote/i })).toBeNull();
  });
});
