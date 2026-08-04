import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockF, mockSwipe, mockToast, mockStyles } = vi.hoisted(() => ({
  mockF: vi.fn<() => any>(),
  mockSwipe: vi.fn<() => any>(),
  mockToast: { error: vi.fn() } as Record<string, (...args: any[]) => any>,
  mockStyles: vi.fn().mockReturnValue(vi.fn())
}));

vi.mock('@/hooks/useQuestionFocus', () => ({ useQuestionFocus: mockF }));
vi.mock('@/hooks/useCardSwipe', () => ({ useCardSwipe: mockSwipe }));
vi.mock('../card-dom-mapper', () => ({ CardDomMapper: () => null }));
vi.mock('react-toastify', () => ({ toast: mockToast }));
vi.mock('@/lib/injectCardStyles', () => ({ injectCardStyles: mockStyles }));

import { CardStackContainer } from '../card-stack-container';

const BASE = {
  activeCardIndex: 0,
  setIdx: vi.fn(),
  totalFocusable: 3,
  totalAnswerable: 3,
  cardStates: { q1: 'active', q2: 'future', q3: 'future' },
  displayItemLinkIds: [],
  focusableLinkIds: ['q1', 'q2', 'q3'],
  isRequired: vi.fn().mockReturnValue(false),
  isAnswered: vi.fn().mockReturnValue(false)
};

describe('CardStackContainer centering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockF.mockReturnValue(BASE);
    mockSwipe.mockReturnValue({
      swipeDirection: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
    vi.spyOn(window, 'scrollTo').mockReturnValue();
  });

  function cards() {
    return (
      <CardStackContainer>
        {['q1', 'q2', 'q3'].map(id => (
          <div key={id} data-link-id={id}>
            {id}
          </div>
        ))}
      </CardStackContainer>
    );
  }

  it('scrolls the window to center the active card vertically', () => {
    const { rerender } = render(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');

    // Mock positions for all cards
    const q1 = vp.querySelector<HTMLElement>('[data-link-id="q1"]');
    const q2 = vp.querySelector<HTMLElement>('[data-link-id="q2"]');
    vi.spyOn(q1, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 280,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    vi.spyOn(q2, 'getBoundingClientRect').mockReturnValue({
      top: 320,
      bottom: 400,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 100
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });
    vi.clearAllMocks();

    // Switch to q2 (index 1)
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    rerender(cards());

    // cardCenterY = 320 + 80/2 = 360
    // targetScrollY = 100 + 360 - 800/2 = 60
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 60,
      behavior: 'smooth'
    });
  });

  it('clears leftover inline styles before scrolling', () => {
    const { rerender } = render(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');
    const q1 = vp.querySelector<HTMLElement>('[data-link-id="q1"]');
    vi.spyOn(q1, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 280,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    // Set stale inline styles
    vp.style.justifyContent = 'center';
    vp.style.paddingTop = '40px';
    const fc = vp.firstElementChild as HTMLElement;
    fc.style.marginTop = '-30px';

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    });
    vi.clearAllMocks();

    // Trigger effect with same index (0) via different focusableLinkIds
    mockF.mockReturnValue({
      ...BASE,
      focusableLinkIds: ['q1', 'q2', 'q3', 'q4'],
      totalFocusable: 4,
      activeCardIndex: 0
    });
    rerender(cards());

    expect(vp.style.justifyContent).toBe('');
    expect(vp.style.paddingTop).toBe('');
    expect(fc.style.marginTop).toBe('');
  });

  it('does nothing when activeCardIndex is out of bounds', () => {
    render(cards());
    vi.clearAllMocks();

    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 99
    });
    render(cards());

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
