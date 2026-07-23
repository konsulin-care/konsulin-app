import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  )
}));

import JournalSuccessDrawer from '../journal-succes-drawer';

describe('JournalSuccessDrawer - English text', () => {
  it('renders the translated title', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Stay Motivated Today!')).toBeDefined();
  });

  it('renders the translated description', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    expect(
      screen.getByText(
        'Writing a journal is an important step to understand yourself and maintain your mental health.'
      )
    ).toBeDefined();
  });
});

describe('JournalSuccessDrawer - compact layout', () => {
  it('renders image with reduced width (120)', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    const img = screen.getByAltText('success');
    expect(img).toBeDefined();
    expect(img.getAttribute('width')).toBe('120');
  });

  it('renders image with reduced padding (p-2)', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    const img = screen.getByAltText('success');
    const classList = img.getAttribute('class') ?? '';
    expect(classList).toContain('p-2');
    expect(classList).not.toContain('p-6');
  });

  it('renders the Back button (footer content)', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Back')).toBeDefined();
  });
});
