/* eslint-disable @next/next/no-img-element */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RecommendationCardStack from '@/components/general/home/recommendation-card-stack';
import RecommendationRefreshCard from '@/components/general/home/recommendation-refresh-card';
import type { Recommendation } from '@/types/recommendation';

const translations: Record<string, string> = {
  'home.find_another_title': 'Find another recommendation',
  'home.find_another_hint': 'Answer a few questions for fresh results',
  'home.find_another_cta': 'Start again'
};

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(
    (namespace: string) => (key: string) =>
      translations[`${namespace}.${key}`] ?? key
  )
}));

/** Captured Swiper props and fake instance shared by the swiper mock. */
const mocks = vi.hoisted(() => {
  const swiperProps: Record<string, unknown> = {};
  return {
    swiperProps,
    fakeSwiper: {
      slideTo: vi.fn<(index: number) => void>(),
      slideToLoop: vi.fn<() => void>(),
      realIndex: 0,
      activeIndex: 0
    }
  };
});

interface SwiperMockProps {
  children: ReactNode;
  onSwiper?: (swiper: unknown) => void;
  [key: string]: unknown;
}

interface SwiperSlideMockProps {
  children: ReactNode | ((state: { isActive: boolean }) => ReactNode);
  [key: string]: unknown;
}

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => (
    <img src={props.src} alt={props.alt} />
  )
}));

vi.mock('swiper/react', () => ({
  Swiper: (props: SwiperMockProps) => {
    mocks.swiperProps = props;
    return <div data-testid='swiper'>{props.children}</div>;
  },
  SwiperSlide: (props: SwiperSlideMockProps) => {
    const content =
      typeof props.children === 'function'
        ? props.children({ isActive: false })
        : props.children;
    return <div data-testid='slide'>{content}</div>;
  }
}));

function makeRecommendation(n: number, name: string): Recommendation {
  return {
    practitionerRoleId: `role-${n}`,
    practitionerId: `practitioner-${n}`,
    practitionerName: name,
    specialties: ['anxiety'],
    scheduleId: `schedule-${n}`,
    healthcareServiceId: `service-${n}`,
    healthcareServiceName: `Service ${n}`,
    durationMinutes: 60,
    fee: 200_000 + n,
    currency: 'IDR',
    locationId: `loc-${n}`,
    locationName: `Location ${n}`,
    locationAddress: { city: 'Jakarta' }
  };
}

const RECOMMENDATIONS = [
  makeRecommendation(1, 'dr. Alpha'),
  makeRecommendation(2, 'dr. Beta'),
  makeRecommendation(3, 'dr. Gamma')
];

describe('RecommendationCardStack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders slides in the exact order of the recommendations array', () => {
    render(
      <RecommendationCardStack
        recommendations={RECOMMENDATIONS}
        onBook={vi.fn()}
      />
    );
    const slides = screen.getAllByTestId('slide');
    expect(slides).toHaveLength(3);
    expect(slides[0]?.textContent).toContain('dr. Alpha');
    expect(slides[1]?.textContent).toContain('dr. Beta');
    expect(slides[2]?.textContent).toContain('dr. Gamma');
  });

  it('disables the infinite loop so swiping stops at the last card', () => {
    render(
      <RecommendationCardStack
        recommendations={RECOMMENDATIONS}
        onBook={vi.fn()}
      />
    );
    expect(mocks.swiperProps.loop).toBeFalsy();
  });

  it('moves to the exact slide when a dot is clicked, without loop navigation', () => {
    render(
      <RecommendationCardStack
        recommendations={RECOMMENDATIONS}
        onBook={vi.fn()}
      />
    );
    const onSwiper = mocks.swiperProps.onSwiper as (swiper: unknown) => void;
    act(() => onSwiper(mocks.fakeSwiper));
    fireEvent.click(screen.getByLabelText('Go to slide 3'));
    expect(mocks.fakeSwiper.slideTo).toHaveBeenCalledWith(2);
    expect(mocks.fakeSwiper.slideToLoop).not.toHaveBeenCalled();
  });

  it('renders the trailing card as the last slide with its own pagination dot', () => {
    render(
      <RecommendationCardStack
        recommendations={RECOMMENDATIONS}
        onBook={vi.fn()}
        trailingCard={<RecommendationRefreshCard onStart={vi.fn()} />}
      />
    );
    const slides = screen.getAllByTestId('slide');
    expect(slides).toHaveLength(4);
    expect(slides[3]?.textContent).toContain('Find another recommendation');
    expect(screen.getByLabelText('Go to slide 4')).toBeInTheDocument();
  });

  it('does not call onBook when the trailing slide is clicked', () => {
    const onBook = vi.fn();
    render(
      <RecommendationCardStack
        recommendations={RECOMMENDATIONS}
        onBook={onBook}
        trailingCard={<RecommendationRefreshCard onStart={vi.fn()} />}
      />
    );
    const slides = screen.getAllByTestId('slide');
    const trailingSlide = slides[3];
    expect(trailingSlide).toBeDefined();
    if (trailingSlide) fireEvent.click(trailingSlide);
    expect(onBook).not.toHaveBeenCalled();
  });

  it('shows the refresh copy and calls onStart from its button', () => {
    const onStart = vi.fn();
    render(<RecommendationRefreshCard onStart={onStart} />);
    expect(screen.getByText('Find another recommendation')).toBeInTheDocument();
    expect(
      screen.getByText('Answer a few questions for fresh results')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
