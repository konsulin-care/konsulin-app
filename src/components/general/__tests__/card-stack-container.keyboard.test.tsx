import { fireEvent, render, screen } from '@testing-library/react';
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
  activeCardIndex: 1,
  setIdx: vi.fn(),
  totalFocusable: 3,
  totalAnswerable: 3,
  cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
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

describe('keyboard navigation', () => {
  let set: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    set = vi.fn();
    mockF.mockReturnValue({ ...BASE, setActiveCardIndex: set });
    mockSwipe.mockReturnValue({
      swipeDirection: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
  });

  function keyDown(cls: string, key: string) {
    const el = document.querySelector<HTMLElement>(`.${cls}`);
    if (!el) throw new Error(`card ${cls} not found`);
    el.focus();
    fireEvent.keyDown(el, { key });
  }

  it('makes non-active cards tabbable with role=button, active card not', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    const answered = document.querySelector('.card-answered');
    const future = document.querySelector('.card-future');
    const active = document.querySelector('.card-active');
    expect(answered?.getAttribute('tabindex')).toBe('0');
    expect(answered?.getAttribute('role')).toBe('button');
    expect(future?.getAttribute('tabindex')).toBe('0');
    expect(active?.getAttribute('tabindex')).toBe('-1');
    expect(active?.hasAttribute('role')).toBe(false);
  });

  it('marks future cards aria-disabled when active card is required and unanswered', () => {
    mockF.mockReturnValue({
      ...BASE,
      setActiveCardIndex: set,
      isRequired: vi.fn().mockReturnValue(true),
      isAnswered: vi.fn().mockReturnValue(false)
    });
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    expect(
      document.querySelector('.card-future')?.getAttribute('aria-disabled')
    ).toBe('true');
    expect(
      document.querySelector('.card-answered')?.hasAttribute('aria-disabled')
    ).toBe(false);
  });

  it('navigates to a future card on Enter', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-future', 'Enter');
    expect(set).toHaveBeenCalledWith(2);
  });

  it('navigates to an answered card on Enter', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-answered', 'Enter');
    expect(set).toHaveBeenCalledWith(0);
  });

  it('navigates to a future card on Space', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-future', ' ');
    expect(set).toHaveBeenCalledWith(2);
  });

  it('blocks Enter on future card when active card is required', () => {
    mockF.mockReturnValue({
      ...BASE,
      setActiveCardIndex: set,
      isRequired: vi.fn().mockReturnValue(true),
      isAnswered: vi.fn().mockReturnValue(false)
    });
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-future', 'Enter');
    expect(set).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('skip')
    );
  });

  it('ignores Enter on the active card', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-active', 'Enter');
    expect(set).not.toHaveBeenCalled();
  });

  it('advances on ArrowDown and moves focus to the next card', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-active', 'ArrowDown');
    expect(set).toHaveBeenCalledWith(2);
    expect(document.activeElement).toBe(document.querySelector('.card-future'));
  });

  it('retreats on ArrowUp and moves focus to the previous card', () => {
    render(
      withCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      })
    );
    keyDown('card-active', 'ArrowUp');
    expect(set).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(
      document.querySelector('.card-answered')
    );
  });

  it('does not hijack arrow keys when focus is inside a form input', () => {
    render(
      <CardStackContainer>
        <div data-link-id='q2' className='card-active'>
          <input data-testid='inner-input' />
        </div>
      </CardStackContainer>
    );
    screen.getByTestId('inner-input').focus();
    fireEvent.keyDown(screen.getByTestId('inner-input'), {
      key: 'ArrowDown'
    });
    expect(set).not.toHaveBeenCalled();
  });
});
