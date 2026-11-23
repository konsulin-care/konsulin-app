import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalProgress } from '../goal-progress';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('GoalProgress', () => {
  it('renders the track, fill, ticks and count label', () => {
    render(<GoalProgress count={30} target={100} />);

    const bar = screen.getByRole('progressbar', {
      name: 'Participant goal'
    });
    expect(bar.className).toContain('bg-muted');
    expect(bar.className).toContain('h-1.5');
    expect(bar.className).toContain('rounded-full');
    expect(bar).toHaveAttribute('aria-valuenow', '30');

    const fill = bar.querySelector('.bg-turquoise-deep');
    expect(fill).not.toBeNull();
    expect(fill?.getAttribute('style')).toContain('width: 30%');

    const ticks = screen.getAllByTestId('goal-tick');
    expect(ticks).toHaveLength(3);
    expect(ticks.map(tick => tick.getAttribute('style'))).toEqual([
      'left: 25%;',
      'left: 50%;',
      'left: 75%;'
    ]);
    expect(ticks.every(tick => tick.className.includes('w-px'))).toBe(true);
    expect(ticks.every(tick => tick.className.includes('bg-border'))).toBe(
      true
    );

    expect(screen.getByText('30 of 100')).toBeInTheDocument();
  });

  it('clamps the progress at 100 percent', () => {
    render(<GoalProgress count={150} target={100} />);

    const bar = screen.getByRole('progressbar', {
      name: 'Participant goal'
    });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(
      bar.querySelector('.bg-turquoise-deep')?.getAttribute('style')
    ).toContain('width: 100%');
    expect(screen.getByText('150 of 100')).toBeInTheDocument();
  });
});
