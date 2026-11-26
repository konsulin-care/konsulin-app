import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuestSaveBanner, {
  type GuestSaveBannerProps
} from '../guest-save-banner';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const NOW = new Date('2026-07-15T12:00:00Z');

const BODY =
  'Your report can be saved for 24 hours. After that, your answers still count toward the study but can no longer be linked to you.';

/**
 * Renders the guest save banner with defaults for the option under test.
 *
 * @param overrides - Prop overrides.
 * @returns The render result.
 */
function renderBanner(overrides: Partial<GuestSaveBannerProps> = {}) {
  return render(
    <GuestSaveBanner
      authored='2026-07-15T08:00:00Z'
      studyId='research'
      isPatient={false}
      now={NOW}
      {...overrides}
    />
  );
}

describe('GuestSaveBanner', () => {
  it('shows the banner linking to the report of the recent guest response', () => {
    renderBanner();

    expect(screen.getByTestId('guest-save-banner')).toHaveTextContent(BODY);
    expect(screen.getByRole('link', { name: 'Save report' })).toHaveAttribute(
      'href',
      '/report?id=research'
    );
  });

  it('hides the banner once the response is older than 24 hours', () => {
    renderBanner({ authored: '2026-07-14T08:00:00Z' });

    expect(screen.queryByTestId('guest-save-banner')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Save report' })).toBeNull();
  });

  it('hides the banner for patients', () => {
    renderBanner({ isPatient: true });

    expect(screen.queryByTestId('guest-save-banner')).toBeNull();
  });

  it('hides the banner when the guest has no recent response', () => {
    renderBanner({ authored: null });

    expect(screen.queryByTestId('guest-save-banner')).toBeNull();
  });

  it('hides the banner when the response has no study', () => {
    renderBanner({ studyId: null });

    expect(screen.queryByTestId('guest-save-banner')).toBeNull();
  });
});
