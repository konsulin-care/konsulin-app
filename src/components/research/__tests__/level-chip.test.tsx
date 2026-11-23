import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LevelChip, LevelProgressBar } from '../level-chip';

describe('LevelChip', () => {
  it('renders its label with the levelled variant styles by default', () => {
    render(<LevelChip label='Lv 2' />);

    const chip = screen.getByTestId('level-chip');
    expect(chip).toHaveTextContent('Lv 2');
    expect(chip).toHaveAttribute('data-variant', 'level');
    expect(chip.className).toContain('bg-accent');
    expect(chip.className).toContain('ring-turquoise-deep');
    expect(chip.className).toContain('font-bold');
    expect(chip.className).toContain('text-foreground');
  });

  it('renders the guest variant with muted styles', () => {
    render(<LevelChip label='Participant' variant='guest' />);

    const chip = screen.getByTestId('level-chip');
    expect(chip).toHaveTextContent('Participant');
    expect(chip).toHaveAttribute('data-variant', 'guest');
    expect(chip.className).toContain('bg-muted');
    expect(chip.className).toContain('border-input');
    expect(chip.className).toContain('text-charcoal-700');
  });
});

describe('LevelProgressBar', () => {
  it('renders a progressbar with the rounded percentage value', () => {
    render(<LevelProgressBar fraction={0.456} label='Level progress' />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Level progress');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '46');
    expect(bar.className).toContain('bg-muted');
    expect(screen.getByTestId('level-progress-fill').className).toContain(
      'bg-turquoise-deep'
    );
  });

  it('clamps fractions above one', () => {
    render(<LevelProgressBar fraction={1.8} label='Level progress' />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('clamps negative fractions to zero', () => {
    render(<LevelProgressBar fraction={-0.4} label='Level progress' />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
  });
});
