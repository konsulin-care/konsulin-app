import type { SwipeDirection } from '@/hooks/useCardSwipe';
import type { QuestionFocusResult } from '@/hooks/useQuestionFocus';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

/**
 * Loose shape accepted by the mocked useQuestionFocus return. Keys mirror
 * QuestionFocusResult but values widen to unknown so per-test overrides
 * (vi.fn() stubs, string cardStates maps) type-check without casts.
 */
export type MockedFocusState = Partial<
  Record<keyof QuestionFocusResult, unknown>
>;

/** Result shape returned by the mocked useCardSwipe hook. */
export interface MockedCardSwipeResult {
  swipeDirection: SwipeDirection | null;
  onTouchStart: () => void;
  onTouchMove: () => void;
  onTouchEnd: () => void;
}

/** Mock stand-in for the useQuestionFocus hook. */
export const mockF = vi.fn<(state?: MockedFocusState) => MockedFocusState>();

/** Mock stand-in for the useCardSwipe hook. */
export const mockSwipe = vi.fn<() => MockedCardSwipeResult>();

/**
 * Default mocked useCardSwipe result: no active swipe with no-op touch
 * handlers. Each call returns fresh vi.fn() stubs so per-test mock-clear
 * assertions stay isolated.
 *
 * @returns Mocked card-swipe result with a null swipeDirection.
 */
export function defaultSwipeResult(): MockedCardSwipeResult {
  return {
    swipeDirection: null,
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn()
  };
}

/**
 * Rect coordinates for a mocked card position. Mirrors the DOMRect fields
 * the card-stack component reads or that tests previously spelled out.
 */
export interface CardRectCoords {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Spy on an element's getBoundingClientRect and return fixed coordinates.
 * Replaces per-test blocks of `vi.spyOn(el, 'getBoundingClientRect')
 * .mockReturnValue({...})`.
 *
 * @param el - Element whose getBoundingClientRect is mocked.
 * @param rect - Card position coordinates returned by the spy.
 * @returns The vitest spy standing in for getBoundingClientRect.
 */
export function mockCardRect(
  el: HTMLElement,
  rect: CardRectCoords
): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    ...rect,
    toJSON: () => ({})
  });
}

/**
 * Shared renderer for the card-stack suites. Delegates to RTL render and
 * returns the full result so tests can rerender the same tree.
 *
 * @param ui - Element to render, typically a CardStackContainer tree.
 * @returns RTL render result including rerender.
 */
export function renderCards(ui: ReactElement): RenderResult {
  return render(ui);
}

/** Mock toast object; assertions target `mockToast.error`. */
export const mockToast = { error: vi.fn() };

/** Mock injectCardStyles recording the style payloads from the component. */
export const mockStyles = vi.fn(() => vi.fn());

/**
 * Base focus-state props shared by the card-stack suites. Tests override via
 * spread (e.g. `{ ...BASE, setActiveCardIndex: set }`).
 */
export const BASE = {
  activeCardIndex: 0,
  setIdx: vi.fn(),
  totalFocusable: 3,
  totalAnswerable: 3,
  cardStates: { q1: 'active', q2: 'future', q3: 'future' },
  displayItemLinkIds: [] as string[],
  focusableLinkIds: ['q1', 'q2', 'q3'],
  isRequired: vi.fn(() => false),
  isAnswered: vi.fn(() => false)
};

const TRANSLATIONS: Record<string, string> = {
  question_navigation: 'Question navigation',
  question_progress: 'Question {current} of {total}',
  cannot_skip_required: "Can't skip required question"
};

/**
 * vi.mock factory for '@/hooks/useQuestionFocus'. Consume via dynamic import
 * inside an async vi.mock factory (hoisting-safe).
 *
 * @returns Mocked module exposing `useQuestionFocus`.
 */
export function questionFocusMockFactory(): {
  useQuestionFocus: typeof mockF;
} {
  return { useQuestionFocus: mockF };
}

/**
 * vi.mock factory for '@/hooks/useCardSwipe'.
 *
 * @returns Mocked module exposing `useCardSwipe`.
 */
export function cardSwipeMockFactory(): {
  useCardSwipe: typeof mockSwipe;
} {
  return { useCardSwipe: mockSwipe };
}

/**
 * vi.mock factory for '../card-dom-mapper'.
 *
 * @returns Mocked module exposing a no-op `CardDomMapper`.
 */
export function cardDomMapperMockFactory(): {
  CardDomMapper: () => null;
} {
  return { CardDomMapper: () => null };
}

/**
 * vi.mock factory for '@/i18n'. Returns a useTranslations mock that resolves
 * the card-stack keys and interpolates `{placeholder}` values.
 *
 * @returns Mocked module exposing `useTranslations`.
 */
export function cardStackI18nMockFactory(): {
  useTranslations: (
    namespace: string
  ) => (key: string, values?: Record<string, number>) => string;
} {
  const useTranslations = vi.fn(
    () => (key: string, values?: Record<string, number>) =>
      (TRANSLATIONS[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values?.[name] ?? '')
      )
  );
  return { useTranslations };
}

/**
 * vi.mock factory for 'react-toastify'.
 *
 * @returns Mocked module exposing `toast`.
 */
export function toastMockFactory(): { toast: typeof mockToast } {
  return { toast: mockToast };
}

/**
 * vi.mock factory for '@/lib/injectCardStyles'.
 *
 * @returns Mocked module exposing `injectCardStyles`.
 */
export function injectCardStylesMockFactory(): {
  injectCardStyles: typeof mockStyles;
} {
  return { injectCardStyles: mockStyles };
}
