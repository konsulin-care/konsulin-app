import { render, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { LocaleProvider } from '../locale-provider';

/** Renders a known key from the common namespace. */
function SaveLabel() {
  const t = useTranslations('common');
  return <span data-testid='save-label'>{t('save')}</span>;
}

/** Remove the locale cookie so tests start from the default locale. */
function clearLocaleCookie(): void {
  // eslint-disable-next-line unicorn/no-document-cookie -- test isolation for locale cookie
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
}

afterEach(() => {
  clearLocaleCookie();
  document.documentElement.lang = '';
});

describe('LocaleProvider', () => {
  it('renders Indonesian (default) when no NEXT_LOCALE cookie exists', () => {
    clearLocaleCookie();
    render(
      <LocaleProvider>
        <SaveLabel />
      </LocaleProvider>
    );
    expect(screen.getByTestId('save-label')).toHaveTextContent('Simpan');
    expect(document.documentElement.lang).toBe('id');
  });

  it('renders English when NEXT_LOCALE=en', () => {
    // eslint-disable-next-line unicorn/no-document-cookie -- set locale cookie for test
    document.cookie = 'NEXT_LOCALE=en; path=/';
    render(
      <LocaleProvider>
        <SaveLabel />
      </LocaleProvider>
    );
    expect(screen.getByTestId('save-label')).toHaveTextContent('Save');
    expect(document.documentElement.lang).toBe('en');
  });

  it('provides NextIntlClientProvider context (assertion moved from layout test)', () => {
    const providerSrc = fs.readFileSync(
      path.resolve(__dirname, '../locale-provider.tsx'),
      'utf-8'
    );
    expect(providerSrc).toContain('NextIntlClientProvider');
  });
});
