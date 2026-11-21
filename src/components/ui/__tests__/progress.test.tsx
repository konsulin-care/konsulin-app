import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Progress } from '../progress';

describe('Progress', () => {
  it('renders a determinate progressbar with aria-valuenow when a value is given', () => {
    render(<Progress value={0.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('data-state', 'loading');
    expect(bar).not.toHaveAttribute('data-state', 'indeterminate');
  });

  it('renders as indeterminate when no value is given', () => {
    render(<Progress />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('data-state', 'indeterminate');
  });

  it('uses the muted surface for the track and no bg-white', () => {
    render(<Progress value={0.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-muted');
    expect(bar).not.toHaveClass('bg-white');
  });

  it('paints the indicator with turquoise-deep by default', () => {
    render(<Progress value={0.5} />);
    const indicator = screen
      .getByRole('progressbar')
      .querySelector('[data-state]');
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveStyle({
      backgroundColor: 'var(--color-turquoise-deep)'
    });
  });

  it('honors a color prop override on the indicator', () => {
    render(<Progress value={0.5} color='var(--color-warning-deep)' />);
    const indicator = screen
      .getByRole('progressbar')
      .querySelector('[data-state]');
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveStyle({
      backgroundColor: 'var(--color-warning-deep)'
    });
  });
});
