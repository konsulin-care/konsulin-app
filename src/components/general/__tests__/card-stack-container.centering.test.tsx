import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useQuestionFocus', async () =>
  (await import('./card-stack-test-fixtures')).questionFocusMockFactory()
);
vi.mock('@/hooks/useCardSwipe', async () =>
  (await import('./card-stack-test-fixtures')).cardSwipeMockFactory()
);
vi.mock('../card-dom-mapper', async () =>
  (await import('./card-stack-test-fixtures')).cardDomMapperMockFactory()
);
vi.mock('@/i18n', async () =>
  (await import('./card-stack-test-fixtures')).cardStackI18nMockFactory()
);
vi.mock('react-toastify', async () =>
  (await import('./card-stack-test-fixtures')).toastMockFactory()
);
vi.mock('@/lib/injectCardStyles', async () =>
  (await import('./card-stack-test-fixtures')).injectCardStylesMockFactory()
);

import { CardStackContainer } from '../card-stack-container';
import {
  BASE,
  defaultSwipeResult,
  mockCardRect,
  mockF,
  mockSwipe,
  renderCards
} from './card-stack-test-fixtures';

describe('CardStackContainer centering', () => {
  const scrollToSpy = vi.spyOn(window, 'scrollTo').mockReturnValue();

  beforeEach(() => {
    vi.clearAllMocks();
    mockF.mockReturnValue(BASE);
    mockSwipe.mockReturnValue(defaultSwipeResult());
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
    const { rerender } = renderCards(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');

    // Mock positions for all cards
    const q1 = vp.querySelector<HTMLElement>('[data-link-id="q1"]');
    const q2 = vp.querySelector<HTMLElement>('[data-link-id="q2"]');
    mockCardRect(q1, {
      top: 200,
      bottom: 280,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0
    });
    mockCardRect(q2, {
      top: 320,
      bottom: 400,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0
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
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 60,
      behavior: 'smooth'
    });
  });

  it('clears leftover inline styles before scrolling', () => {
    const { rerender } = renderCards(cards());
    const vp = document.querySelector<HTMLElement>('.card-stack-viewport');
    const q1 = vp.querySelector<HTMLElement>('[data-link-id="q1"]');
    mockCardRect(q1, {
      top: 200,
      bottom: 280,
      left: 0,
      right: 300,
      width: 300,
      height: 80,
      x: 0,
      y: 0
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
    renderCards(cards());
    vi.clearAllMocks();

    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 99
    });
    renderCards(cards());

    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
