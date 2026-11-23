import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SectionHeader from '../section-header';

describe('SectionHeader', () => {
  it('renders the zero-padded number and the label inside a border-t header', () => {
    render(<SectionHeader number={3} label='Study' />);
    const header = screen.getByTestId('section-header-3');
    expect(header.className).toContain('border-t');
    expect(header.className).toContain('border-border');
    expect(header).toHaveTextContent('03');
    expect(header).toHaveTextContent('Study');
  });

  it('pads single-digit numbers to two characters', () => {
    render(<SectionHeader number={1} label='Study' />);
    expect(screen.getByTestId('section-header-1')).toHaveTextContent('01');
  });
});
