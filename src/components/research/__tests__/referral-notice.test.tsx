import { scanSource } from '@/styles/__tests__/raw-color-scan';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReferralNotice from '../referral-notice';

const __dirname = dirname(fileURLToPath(import.meta.url));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('ReferralNotice', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/research');
  });

  it('renders the consent note when a patient ref is present in the url', () => {
    window.history.replaceState({}, '', '/research?ref=p_DG3F3STPYZ6HX25A');

    render(<ReferralNotice />);

    const notice = screen.getByTestId('referral-notice');
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toContain('community credit');
    expect(notice.className).toContain('bg-accent');
    expect(notice.className).toContain('border-turquoise-deep/30');
  });

  it('leaves no raw colour findings in its source', () => {
    const source = readFileSync(
      resolve(__dirname, '../referral-notice.tsx'),
      'utf8'
    );

    expect(scanSource(source)).toEqual([]);
  });

  it('renders nothing without a ref', () => {
    render(<ReferralNotice />);
    expect(screen.queryByTestId('referral-notice')).not.toBeInTheDocument();
  });

  it('renders the note copy with charcoal text', () => {
    window.history.replaceState({}, '', '/research?ref=p_DG3F3STPYZ6HX25A');

    render(<ReferralNotice />);

    const paragraph = screen.getByText(/community credit/);
    expect(paragraph.className).toContain('text-charcoal-700');
  });

  it('renders nothing for a non-patient ref', () => {
    window.history.replaceState({}, '', '/research?ref=g_guest-1');
    render(<ReferralNotice />);
    expect(screen.queryByTestId('referral-notice')).not.toBeInTheDocument();
  });
});
