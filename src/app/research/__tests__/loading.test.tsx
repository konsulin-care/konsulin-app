import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from '../loading';

describe('research route loading', () => {
  it('renders a skeleton placeholder while the route chunk loads', () => {
    render(<Loading />);

    expect(screen.getByTestId('research-route-loading')).toBeTruthy();
  });

  it('uses an <output> element with the implicit status role', () => {
    render(<Loading />);

    expect(screen.getByTestId('research-route-loading').tagName).toBe('OUTPUT');
    expect(screen.getByRole('status')).toBe(
      screen.getByTestId('research-route-loading')
    );
  });
});
