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
});
