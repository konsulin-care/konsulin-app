import { fireEvent, render } from '@testing-library/react';
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

function withCards(classes: Record<string, string>) {
  return (
    <CardStackContainer>
      {Object.entries(classes).map(([id, cls]) => (
        <div key={id} className={cls} data-link-id={id}>
          {id}
        </div>
      ))}
    </CardStackContainer>
  );
}

describe('click-to-navigate', () => {
  let set: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    set = vi.fn();
    mockF.mockReturnValue({
      ...BASE,
      setActiveCardIndex: set,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(false)
    });
    mockSwipe.mockReturnValue({
      swipeDirection: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
  });

  function click(cls: string) {
    fireEvent.click(document.querySelector('.' + cls));
  }

  it('navigates to answered card', () => {
    render(withCards({ q1: 'card-answered', q2: 'card-active' }));
    click('card-answered');
    expect(set).toHaveBeenCalledWith(0);
  });

  it('navigates to future card', () => {
    render(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-future');
    expect(set).toHaveBeenCalledWith(2);
  });

  it('ignores click on active card', () => {
    render(withCards({ q1: 'card-answered', q2: 'card-active' }));
    click('card-active');
    expect(set).not.toHaveBeenCalled();
  });

  it('blocks future click when current is required', () => {
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      setActiveCardIndex: set,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      isRequired: vi.fn().mockReturnValue(true),
      isAnswered: vi.fn().mockReturnValue(false)
    });
    render(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-future');
    expect(set).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('skip')
    );
  });

  it('navigates to skipped card', () => {
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 2,
      setActiveCardIndex: set,
      cardStates: {
        q1: 'answered',
        q2: 'skipped',
        q3: 'active',
        q4: 'future'
      },
      focusableLinkIds: ['q1', 'q2', 'q3', 'q4'],
      totalFocusable: 4
    });
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-skipped',
        q3: 'card-active',
        q4: 'card-future'
      })
    );
    click('card-skipped');
    expect(set).toHaveBeenCalledWith(1);
  });

  it('returns to origin when visited card becomes answered', () => {
    const def = {
      ...BASE,
      setActiveCardIndex: set,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(false)
    };
    mockF.mockReturnValue(def);
    const { rerender } = render(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-future');
    expect(set).toHaveBeenCalledWith(2);
    set.mockClear();
    mockF.mockReturnValue({
      ...def,
      activeCardIndex: 2,
      cardStates: { q1: 'answered', q2: 'future', q3: 'answered' }
    });
    rerender(
      withCards({
        q1: 'card-answered',
        q2: 'card-future',
        q3: 'card-answered'
      })
    );
    expect(set).toHaveBeenCalledWith(1);
  });

  it('does not track return for already-answered card', () => {
    const s = vi.fn();
    const base = {
      ...BASE,
      activeCardIndex: 1,
      setActiveCardIndex: s,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(true)
    };
    mockF.mockReturnValue(base);
    const { rerender } = render(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-answered');
    expect(s).toHaveBeenCalledWith(0);
    s.mockClear();
    mockF.mockReturnValue({
      ...base,
      isAnswered: vi.fn().mockReturnValue(false)
    });
    rerender(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    expect(s).not.toHaveBeenCalled();
  });
});
