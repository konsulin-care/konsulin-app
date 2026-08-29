import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CircularProgress from '../circular-progress';

describe('CircularProgress', () => {
  it('renders the rounded percentage text for a 0-1 value', () => {
    render(<CircularProgress value={0.33} />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('clamps values above 1 to 100% and below 0 to 0%', () => {
    render(<CircularProgress value={1.5} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    render(<CircularProgress value={-0.5} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('exposes progress via the aria-valuenow attribute', () => {
    render(<CircularProgress value={0.5} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toHaveAttribute('aria-valuenow', '50');
    expect(ring).toHaveAttribute('aria-valuemin', '0');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('drives the foreground arc with stroke-dashoffset from the value', () => {
    const { container } = render(<CircularProgress value={0.25} />);
    // radius shrinks as strokeWidth grows: r = (size - strokeWidth) / 2.
    const radius = (120 - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    // Foreground arc: full circumference minus the completed fraction.
    expect(circles[1]).toHaveAttribute(
      'stroke-dashoffset',
      String(circumference * (1 - 0.25))
    );
    // Background circle paints the uncharted remainder in gray.
    expect(circles[0]).toHaveAttribute('stroke', '#E5E7EB');
  });

  it('applies a passed className to the wrapper', () => {
    render(<CircularProgress value={0.5} className='mx-auto' />);
    expect(screen.getByRole('progressbar').getAttribute('class')).toContain(
      'mx-auto'
    );
  });

  it('honors custom size and strokeWidth', () => {
    render(<CircularProgress value={0.5} size={160} strokeWidth={12} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toHaveAttribute('width', '160');
    expect(ring).toHaveAttribute('height', '160');
    const circles = ring.querySelectorAll('circle');
    expect(circles[0]).toHaveAttribute('stroke-width', '12');
  });
});
