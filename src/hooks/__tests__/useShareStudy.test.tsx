import enResearch from '@/messages/en/research.json';
import idResearch from '@/messages/id/research.json';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShareStudy } from '../useShareStudy';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('useShareStudy', () => {
  const ORIGIN = 'https://konsulin.care';
  const TITLE = 'Sleep Cohort';
  const MESSAGE =
    `I'm taking part in ${TITLE} on Konsulin. Join me:\n` +
    'https://konsulin.care/research?view=study-x';

  it('uses the exact English and Indonesian share texts', () => {
    expect(enResearch.share_message).toBe(
      "I'm taking part in {title} on Konsulin. Join me:"
    );
    expect(idResearch.share_message).toBe(
      'Saya ikut serta dalam {title} di Konsulin. Ikut juga:'
    );
    expect(MESSAGE).not.toContain('citizen scientist');
  });

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
      'https://konsulin.care/research?view=study-x&ref=p_DG3F3STPYZ6HX25A'
    );
  });

  it('builds a study-scoped plain share url for guests', () => {
    const { result } = renderHook(() =>
      useShareStudy({ studyId: 'study-x', isPatient: false })
    );

    expect(result.current.shareUrl).toBe(
      'https://konsulin.care/research?view=study-x'
    );
  });

  it('shares the full message via the Web Share API', async () => {
    const shareMock = vi.fn(() => Promise.resolve());
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
      url: 'https://konsulin.care/research?view=study-x'
    });
    expect(result.current.copied).toBe(false);
  });

  it('falls back to the clipboard with the full message', async () => {
    const clipboardMock = vi.fn(() => Promise.resolve());
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
    const clipboardMock = vi.fn(() => Promise.resolve());
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
