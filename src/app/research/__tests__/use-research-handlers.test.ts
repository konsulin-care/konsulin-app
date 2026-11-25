import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResearchHandlers } from '../use-research-handlers';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace };

let mockSearchParamsInstance: URLSearchParams;

const mockUseSearchParams = vi.fn(() => mockSearchParamsInstance);
const mockUsePathname = vi.fn(() => '/research');

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname()
}));

beforeEach(() => {
  mockReplace.mockReset();
  mockPush.mockReset();
  mockSearchParamsInstance = new URLSearchParams();
  mockUsePathname.mockReturnValue('/research');
});

describe('useResearchHandlers', () => {
  it('uses useSearchParams from next/navigation, not a prop', () => {
    const { result } = renderHook(
      () =>
        useResearchHandlers({
          studies: [],
          detailStudyId: null,
          isConsented: () => true,
          setActiveStudyId: vi.fn(),
          setDetailStudyId: vi.fn(),
          setPendingConsent: vi.fn(),
          router: mockRouter
        }),
      {
        wrapper: ({ children }) => createElement('div', null, children)
      }
    );

    // Verify useSearchParams was called (the hook calls it internally)
    expect(mockUseSearchParams).toHaveBeenCalled();

    // Set up a URL with view param
    mockSearchParamsInstance.set('view', 'study-1');

    // Trigger handleSlideChange
    result.current.handleSlideChange('study-1');

    // The hook should use the hook-level searchParams, not a prop.
    // Since there's no view param change needed (view=study-1 already set),
    // router.replace should NOT be called to drop the view.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('uses fresh searchParams on each render (no stale closure)', () => {
    const setDetailStudyId = vi.fn();
    const setActiveStudyId = vi.fn();

    // Simulate React behavior: useSearchParams returns a new object per render.
    // First render: no params.
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { result, rerender } = renderHook(
      () =>
        useResearchHandlers({
          studies: [],
          detailStudyId: null,
          isConsented: () => true,
          setActiveStudyId,
          setDetailStudyId,
          setPendingConsent: vi.fn(),
          router: mockRouter
        }),
      {
        wrapper: ({ children }) => createElement('div', null, children)
      }
    );

    // Second render: URL now has ?view=study-1 (new object, not mutated).
    mockUseSearchParams.mockReturnValue(new URLSearchParams('view=study-1'));

    // Re-render (simulates React re-render after URL change)
    rerender();

    // Now trigger handleSlideChange for the same study
    result.current.handleSlideChange('study-1');

    // Since view=study-1 is already in the URL, handleSlideChange should
    // return early without calling router.replace.
    // If the hook used a stale prop (from the first render where view was
    // absent), it would incorrectly call router.replace to drop the view.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("closing the detail drawer on '/' rewrites to '/?id=<study>'", () => {
    mockUsePathname.mockReturnValue('/');

    const { result } = renderHook(
      () =>
        useResearchHandlers({
          studies: [],
          detailStudyId: 'study-1',
          isConsented: () => true,
          setActiveStudyId: vi.fn(),
          setDetailStudyId: vi.fn(),
          setPendingConsent: vi.fn(),
          router: mockRouter
        }),
      {
        wrapper: ({ children }) => createElement('div', null, children)
      }
    );

    result.current.handleDrawerClose();

    expect(mockReplace).toHaveBeenCalledWith('/?id=study-1');
  });
});
