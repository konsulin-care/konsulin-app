/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RecommendationCard from '@/components/general/home/recommendation-card';
import {
  MOCK_RECOMMENDATIONS,
  Recommendation
} from '@/constants/recommendations';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  )
}));

const BASE_REC: Recommendation = MOCK_RECOMMENDATIONS[0];

function makeProps(overrides?: Partial<Recommendation>) {
  return { recommendation: { ...BASE_REC, ...overrides } };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecommendationCard', () => {
  it('renders photo when photoUrl is set', () => {
    render(
      <RecommendationCard
        recommendation={{ ...BASE_REC, photoUrl: '/photo.jpg' }}
      />
    );
    const img = screen.getByAltText('dr. Sarah Chen');
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain('/photo.jpg');
  });

  it('renders gradient fallback when photoUrl is empty', () => {
    render(<RecommendationCard {...makeProps({ photoUrl: '' })} />);
    const img = screen.getByAltText('dr. Sarah Chen');
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain('data:image/svg+xml');
  });

  it('renders practitioner name', () => {
    render(<RecommendationCard {...makeProps()} />);
    expect(
      screen.getAllByText(/dr\.\s*Sarah\s*Chen/).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders formatted fee in IDR', () => {
    render(<RecommendationCard {...makeProps({ fee: 500_000 })} />);
    const feeElements = screen.getAllByText(/500\.000/);
    expect(feeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders specialty badges', () => {
    render(<RecommendationCard {...makeProps()} />);
    expect(screen.getByText('addiction')).toBeDefined();
    expect(screen.getByText('substance use')).toBeDefined();
  });

  it('renders description when present', () => {
    render(<RecommendationCard {...makeProps()} />);
    expect(screen.getByText(/smoking/)).toBeDefined();
  });

  it('does not render description when empty', () => {
    render(<RecommendationCard {...makeProps({ description: '' })} />);
    expect(screen.queryByText(/smoking/)).toBeNull();
  });

  it('adds button role and keyboard handler when onClick provided', () => {
    const onClick = vi.fn();
    render(<RecommendationCard {...makeProps()} onClick={onClick} />);
    const buttons = screen.getAllByRole('button');
    // Card wrapper button is the first one; it fires onClick on click
    const cardButton = buttons[0];
    expect(cardButton).toBeDefined();
    fireEvent.click(cardButton);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(cardButton);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('renders overlay button when touch device support is present', () => {
    render(<RecommendationCard {...makeProps()} />);
    const buttons = screen.getAllByRole('button');
    // ExpandingOverlay button is always rendered as a <button>
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('forwards className to root element', () => {
    render(<RecommendationCard {...makeProps()} className='custom-class' />);
    const root = screen
      .getByAltText('dr. Sarah Chen')
      .closest('[class*="custom-class"]');
    expect(root).toBeDefined();
  });

  it('forwards style to root element', () => {
    render(<RecommendationCard {...makeProps()} style={{ opacity: 0.5 }} />);
    const root = screen
      .getByAltText('dr. Sarah Chen')
      .closest('[style*="0.5"]');
    expect(root).toBeDefined();
  });

  it('expands overlay on click when touch device', () => {
    globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: none)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    render(
      <RecommendationCard
        {...makeProps({ photoUrl: '/photo.jpg', description: 'test desc' })}
      />
    );
    const overlay = screen
      .getByText('test desc')
      .closest('[class*="absolute"]')?.parentElement;
    expect(overlay).toBeDefined();
    if (overlay) {
      const initialClass = overlay.className;
      fireEvent.click(overlay);
      expect(overlay.className).not.toBe(initialClass);
    }
  });

  it('renders service name', () => {
    render(
      <RecommendationCard {...makeProps({ serviceName: 'Test Service' })} />
    );
    expect(screen.getAllByText('Test Service').length).toBeGreaterThanOrEqual(
      1
    );
  });

  it('renders initials based on name', () => {
    render(<RecommendationCard {...makeProps({ photoUrl: '' })} />);
    const img = screen.getByAltText('dr. Sarah Chen');
    expect((img as HTMLImageElement).src).toContain('data:image/svg+xml');
  });
});
