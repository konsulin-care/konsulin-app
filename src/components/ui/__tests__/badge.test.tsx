import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
  it('renders the secondary variant with the accent tint', () => {
    render(<Badge variant='secondary'>Secondary</Badge>);

    const badge = screen.getByText('Secondary');
    expect(badge.className).toContain('bg-accent');
    expect(badge.className).toContain('text-accent-foreground');
    expect(badge.className).not.toContain('bg-secondary');
  });
});
