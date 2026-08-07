import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShareStudy } from '../useShareStudy';

describe('useShareStudy', () => {
  const ORIGIN = 'https://konsulin.care';
  const TITLE = 'Sleep Cohort';
  const MESSAGE =
    `Join me as a citizen scientist through ${TITLE} in Konsulin.\n` +
    'https://konsulin.care/research?id=study-x';

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

  it('shares the full message via the Web Share API', async () => {
    const shareMock = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share: shareMock });

    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false, title: TITLE })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(shareMock).toHaveBeenCalledWith({
      title: TITLE,
      text: MESSAGE,
      url: 'https://konsulin.care/research?id=study-x'
    });
    expect(result.current.copied).toBe(false);
  });

  it('falls back to the clipboard with the full message', async () => {
    const clipboardMock = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: clipboardMock }
    });

    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false, title: TITLE })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(clipboardMock).toHaveBeenCalledWith(MESSAGE);
    expect(result.current.copied).toBe(true);
  });

  it('falls back to the clipboard when canShare rejects the payload', async () => {
    const shareMock = vi.fn();
    const clipboardMock = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, {
      share: shareMock,
      canShare: () => false,
      clipboard: { writeText: clipboardMock }
    });

    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false, title: TITLE })
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(shareMock).not.toHaveBeenCalled();
    expect(clipboardMock).toHaveBeenCalledWith(MESSAGE);
    expect(result.current.copied).toBe(true);
  });
});
