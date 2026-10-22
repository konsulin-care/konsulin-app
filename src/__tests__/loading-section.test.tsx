import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingSection from '../components/general/loading-section';

describe('LoadingSection', () => {
  it('renders a pulse animation skeleton', () => {
    render(<LoadingSection />);
    const el = screen.getByTestId('loading-section');
    expect(el).toBeDefined();
    expect(el.className).toContain('animate-pulse');
  });

  it('applies custom className', () => {
    render(<LoadingSection className='extra-class' />);
    const el = screen.getByTestId('loading-section');
    expect(el.className).toContain('extra-class');
  });

  it('renders with default height class', () => {
    render(<LoadingSection />);
    const el = screen.getByTestId('loading-section');
    expect(el.className).toContain('h-24');
  });
});
