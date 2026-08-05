import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShareStudy } from '../useShareStudy';

describe('useShareStudy', () => {
  const ORIGIN = 'https://konsulin.care';

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL(`${ORIGIN}/research`)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a study-scoped patient share url', () => {
    const { result } = renderHook(() =>
      useShareStudy({
        studyId: 'study-x',
        isPatient: true,
        fhirId: 'DG3F3STPYZ6HX25A'
      })
    );

    expect(result.current.shareUrl).toBe(
      'https://konsulin.care/research?id=study-x&ref=p_DG3F3STPYZ6HX25A'
    );
  });

  it('builds a study-scoped plain share url for guests', () => {
    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false })
    );

    expect(result.current.shareUrl).toBe(
      'https://konsulin.care/research?id=study-x'
    );
  });

  it('shares via the Web Share API and increments the booster', async () => {
    const shareMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, { share: shareMock });

    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(shareMock).toHaveBeenCalledWith({
      url: 'https://konsulin.care/research?id=study-x'
    });
    expect(result.current.copied).toBe(false);
    expect(window.localStorage.getItem('konsulin_share_booster')).toBe('1');
  });

  it('falls back to the clipboard with copied feedback', async () => {
    const clipboardMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: clipboardMock }
    });

    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(clipboardMock).toHaveBeenCalledWith(
      'https://konsulin.care/research?id=study-x'
    );
    expect(result.current.copied).toBe(true);
    expect(window.localStorage.getItem('konsulin_share_booster')).toBe('1');
  });
});
