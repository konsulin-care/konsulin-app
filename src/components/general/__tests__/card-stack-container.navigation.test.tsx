import { fireEvent } from '@testing-library/react';
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
  mockF,
  mockSwipe,
  mockToast,
  renderCards
} from './card-stack-test-fixtures';

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
    mockSwipe.mockReturnValue(defaultSwipeResult());
  });

  function click(cls: string) {
    fireEvent.click(document.querySelector(`.${cls}`));
  }

  it('navigates to answered card', () => {
    renderCards(withCards({ q1: 'card-answered', q2: 'card-active' }));
    click('card-answered');
    expect(set).toHaveBeenCalledWith(0);
  });

  it('navigates to future card', () => {
    renderCards(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-future');
    expect(set).toHaveBeenCalledWith(2);
  });

  it('ignores click on active card', () => {
    renderCards(withCards({ q1: 'card-answered', q2: 'card-active' }));
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
    renderCards(
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
    renderCards(
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
    const { rerender } = renderCards(
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
    const setActiveCardIndex = vi.fn();
    const base = {
      ...BASE,
      activeCardIndex: 1,
      setActiveCardIndex,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(true)
    };
    mockF.mockReturnValue(base);
    const { rerender } = renderCards(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    click('card-answered');
    expect(setActiveCardIndex).toHaveBeenCalledWith(0);
    setActiveCardIndex.mockClear();
    mockF.mockReturnValue({
      ...base,
      isAnswered: vi.fn().mockReturnValue(false)
    });
    rerender(
      withCards({ q1: 'card-answered', q2: 'card-active', q3: 'card-future' })
    );
    expect(setActiveCardIndex).not.toHaveBeenCalled();
  });
});
