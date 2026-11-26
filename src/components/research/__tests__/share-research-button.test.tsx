import enResearch from '@/messages/en/research.json';
import idResearch from '@/messages/id/research.json';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShareResearchButton from '../share-research-button';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const TITLE = 'Sleep Cohort';
const ORIGIN = 'https://konsulin.care';
const STUDY_ID = 'study-x';
const GUEST_URL = `${ORIGIN}/study?id=${STUDY_ID}`;
const PATIENT_FHIR_ID = 'DG3F3STPYZ6HX25A';
const PATIENT_URL = `${GUEST_URL}&ref=p_${PATIENT_FHIR_ID}`;

/**
 * Builds the shared text the study share button produces for a URL.
 *
 * @param url - Share URL appended after the invite message.
 * @returns Invite message, a newline, then the URL.
 */
function shareText(url: string): string {
  return `${enResearch.share_message.replace('{title}', TITLE)}\n${url}`;
}

describe('ShareResearchButton', () => {
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

  it('uses the exact landed share copy in both locales', () => {
    expect(enResearch.share_message).toBe(
      "I'm taking part in {title} on Konsulin. Join me:"
    );
    expect(idResearch.share_message).toBe(
      'Saya ikut serta dalam {title} di Konsulin. Ikut juga:'
    );
    expect(enResearch.share_default_label).toBe('Share this study');
    expect(idResearch.share_default_label).toBe('Bagikan studi ini');
  });

  it('builds the invite message from the translated share message with a trailing newline', () => {
    expect(shareText(GUEST_URL)).toBe(
      "I'm taking part in Sleep Cohort on Konsulin. Join me:\n" +
        'https://konsulin.care/study?id=study-x'
    );
    expect(shareText(GUEST_URL)).not.toContain('citizen scientist');
  });

  it('renders a footer button with the share icon and the Share this study label', () => {
    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId={STUDY_ID} />
    );

    const button = screen.getByTestId('share-research-footer');
    expect(button).toHaveTextContent('Share this study');
    expect(button.querySelector('svg')).toBeTruthy();
  });

  it('shares the study deep link and invite message via the Web Share API', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });

    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId={STUDY_ID} />
    );

    fireEvent.click(screen.getByTestId('share-research-footer'));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: TITLE,
        text: shareText(GUEST_URL),
        url: GUEST_URL
      });
    });
  });

  it('carries the patient ref on the study link and no ref for a guest', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { share });

    render(
      <ShareResearchButton
        title={TITLE}
        isPatient
        fhirId={PATIENT_FHIR_ID}
        studyId={STUDY_ID}
      />
    );

    fireEvent.click(screen.getByTestId('share-research-footer'));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: TITLE,
        text: shareText(PATIENT_URL),
        url: PATIENT_URL
      });
    });

    share.mockClear();
    render(
      <ShareResearchButton
        title={TITLE}
        isPatient={false}
        studyId={STUDY_ID}
        dataTestId='guest-share'
      />
    );

    fireEvent.click(screen.getByTestId('guest-share'));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: TITLE,
        text: shareText(GUEST_URL),
        url: GUEST_URL
      });
    });
  });

  it('copies the invite message and shows Link copied! when share is unavailable', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText }
    });

    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId={STUDY_ID} />
    );

    fireEvent.click(screen.getByTestId('share-research-footer'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(shareText(GUEST_URL));
    });
    expect(await screen.findByText('Link copied!')).toBeTruthy();
  });

  it('renders a custom label when given', () => {
    render(
      <ShareResearchButton
        title={TITLE}
        isPatient={false}
        studyId={STUDY_ID}
        label='Share Research'
        dataTestId='custom-share'
      />
    );

    expect(screen.getByTestId('custom-share')).toHaveTextContent(
      'Share Research'
    );
  });

  it('applies the className to the button', () => {
    render(
      <ShareResearchButton
        title={TITLE}
        isPatient={false}
        studyId={STUDY_ID}
        className='text-black'
      />
    );

    expect(screen.getByTestId('share-research-footer')).toHaveClass(
      'text-black'
    );
  });
});
