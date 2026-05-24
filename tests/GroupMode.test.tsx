import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupMode } from '../src/components/GroupMode';

describe('GroupMode', () => {
  it('shows error when create group clicked without prompt', async () => {
    render(<GroupMode />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    expect(screen.getByText(/enter a prompt/i)).toBeTruthy();
  });

  it('shows group code after creating group', async () => {
    render(<GroupMode />);
    await userEvent.type(screen.getByRole('textbox'), '5 people chill $20');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    expect(screen.getByText(/VP-/)).toBeTruthy();
  });

  it('shows voting panel after proceeding past setup', async () => {
    render(<GroupMode />);
    await userEvent.type(screen.getByRole('textbox'), 'chill night $15');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.click(screen.getByRole('button', { name: /see top ideas/i }));
    expect(screen.getByText(/vote for the plan/i)).toBeTruthy();
  });

  it('shows improve button after voting', async () => {
    render(<GroupMode />);
    await userEvent.type(screen.getByRole('textbox'), 'chill night $15');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.click(screen.getByRole('button', { name: /see top ideas/i }));
    const voteButtons = screen.getAllByRole('button', { name: /^vote$/i });
    await userEvent.click(voteButtons[0]);
    expect(screen.getByRole('button', { name: /improve winning plan/i })).toBeTruthy();
  });

  it('shows improved plan card after improve button clicked', async () => {
    render(<GroupMode />);
    await userEvent.type(screen.getByRole('textbox'), 'chill night $15');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await userEvent.click(screen.getByRole('button', { name: /see top ideas/i }));
    const voteButtons = screen.getAllByRole('button', { name: /^vote$/i });
    await userEvent.click(voteButtons[0]);
    await userEvent.click(screen.getByRole('button', { name: /improve winning plan/i }));
    expect(screen.getByText(/improved plan/i)).toBeTruthy();
  });
});
