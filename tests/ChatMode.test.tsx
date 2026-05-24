import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMode } from '../src/components/ChatMode';

describe('ChatMode', () => {
  it('shows error when submitted with empty input', async () => {
    render(<ChatMode />);
    await userEvent.click(screen.getByRole('button', { name: /find ideas/i }));
    expect(screen.getByText(/type something/i)).toBeTruthy();
  });

  it('shows error when input is too short', async () => {
    render(<ChatMode />);
    await userEvent.type(screen.getByRole('textbox'), 'hi');
    await userEvent.click(screen.getByRole('button', { name: /find ideas/i }));
    expect(screen.getByText(/add a little more detail/i)).toBeTruthy();
  });

  it('shows top 3 results after valid input', async () => {
    render(<ChatMode />);
    await userEvent.type(screen.getByRole('textbox'), 'chill night $15 budget');
    await userEvent.click(screen.getByRole('button', { name: /find ideas/i }));
    expect(screen.getByText(/top 3 ideas/i)).toBeTruthy();
    expect(screen.getAllByText(/#\d/)).toHaveLength(3);
  });

  it('populates textarea when suggestion chip is clicked', async () => {
    render(<ChatMode />);
    const chip = screen.getByText(/bored tonight/i);
    await userEvent.click(chip);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Bored tonight');
  });

  it('clears error after valid submission', async () => {
    render(<ChatMode />);
    await userEvent.click(screen.getByRole('button', { name: /find ideas/i }));
    expect(screen.getByText(/type something/i)).toBeTruthy();
    await userEvent.type(screen.getByRole('textbox'), 'chill friends tonight $20');
    await userEvent.click(screen.getByRole('button', { name: /find ideas/i }));
    expect(screen.queryByText(/type something/i)).toBeNull();
  });
});
