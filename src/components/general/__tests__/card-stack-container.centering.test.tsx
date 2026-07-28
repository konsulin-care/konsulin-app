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

  it('centers active card via padding when content does not overflow', () => {
    const { rerender } = render(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');

    // Ensure no overflow (scrollHeight <= clientHeight)
    Object.defineProperty(vp, 'scrollHeight', {
      configurable: true,
      value: 400
    });
    Object.defineProperty(vp, 'clientHeight', {
      configurable: true,
      value: 600
    });

    // Mock viewport getBoundingClientRect
    vi.spyOn(vp, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    // Mock the second card (q2) position
    const card = vp.querySelector<HTMLElement>('[data-link-id="q2"]');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
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

    // Trigger centering effect by changing active to q2 (index 1)
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    rerender(cards());

    // cardCenterY = 200 - 0 + 80/2 = 240
    // viewportCenterY = 600 / 2 = 300
    // targetPadding = 300 - 240 = 60
    expect(vp.style.paddingTop).toBe('60px');
    expect(vp.style.justifyContent).toBe('');
  });

  it('clamps padding to zero when card is below viewport center', () => {
    const { rerender } = render(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');

    Object.defineProperty(vp, 'scrollHeight', {
      configurable: true,
      value: 400
    });
    Object.defineProperty(vp, 'clientHeight', {
      configurable: true,
      value: 600
    });

    vi.spyOn(vp, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    // First card (q1) position: already below viewport center
    const card = vp.querySelector<HTMLElement>('[data-link-id="q1"]');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      top: 350,
      bottom: 420,
      left: 0,
      right: 300,
      width: 300,
      height: 70,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 0,
      cardStates: { q1: 'active', q2: 'future', q3: 'future' }
    });
    rerender(cards());

    // cardCenterY = 350 - 0 + 70/2 = 385
    // viewportCenterY = 600 / 2 = 300
    // targetPadding = 300 - 385 = -85 -> Math.max(0, -85) = 0
    expect(vp.style.paddingTop).toBe('0px');
  });

  it('scrolls into view when content overflows', () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { rerender } = render(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');
    Object.defineProperty(vp, 'scrollHeight', {
      configurable: true,
      value: 500
    });
    Object.defineProperty(vp, 'clientHeight', {
      configurable: true,
      value: 300
    });
    spy.mockClear();
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 2,
      cardStates: { q1: 'answered', q2: 'answered', q3: 'active' }
    });
    rerender(cards());
    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(vp.style.justifyContent).toBe('');
    spy.mockRestore();
  });
});
