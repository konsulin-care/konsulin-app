import enAdmin from '@/messages/en/admin.json';
import idAdmin from '@/messages/id/admin.json';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@/lib/locale';

import { LocaleProvider } from '../locale-provider';

/** Renders a known key from the common namespace. */
function SaveLabel() {
  const t = useTranslations('common');
  return <span data-testid='save-label'>{t('save')}</span>;
}

/** Renders a known key from the admin namespace. */
function AdminTitle() {
  const t = useTranslations('admin');
  return <span data-testid='admin-title'>{t('console_title')}</span>;
}

/** Renders the save label plus local state to detect reloads/remounts. */
function LocaleSwitchProbe() {
  const t = useTranslations('common');
  const [clicks, setClicks] = useState(0);

  return (
    <>
      <span data-testid='save-label'>{t('save')}</span>
      <span data-testid='state-counter'>{clicks}</span>
      <button type='button' onClick={() => setClicks(value => value + 1)}>
        bump
      </button>
    </>
  );
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

  it('re-renders translated text and updates document lang on setLocale without a reload', () => {
    clearLocaleCookie();
    const hrefBefore = window.location.href;
    const { getByTestId } = render(
      <LocaleProvider>
        <LocaleSwitchProbe />
      </LocaleProvider>
    );
    const label = getByTestId('save-label');
    const counter = getByTestId('state-counter');

    // Same component instance throughout: no unmount/remount, no reload.
    expect(label).toHaveTextContent('Simpan');
    expect(document.documentElement.lang).toBe('id');

    // Component-local state survives the locale switch -> no page reload.
    fireEvent.click(screen.getByRole('button', { name: 'bump' }));
    expect(counter).toHaveTextContent('1');

    act(() => {
      setLocale('en');
    });
    expect(label).toHaveTextContent('Save');
    expect(document.documentElement.lang).toBe('en');
    expect(counter).toHaveTextContent('1');
    expect(window.location.href).toBe(hrefBefore);

    act(() => {
      setLocale('id');
    });
    expect(label).toHaveTextContent('Simpan');
    expect(document.documentElement.lang).toBe('id');
    expect(counter).toHaveTextContent('1');
    expect(window.location.href).toBe(hrefBefore);
  });

  it('loads the admin namespace for id and renders its key without raw fallback', () => {
    clearLocaleCookie();
    render(
      <LocaleProvider>
        <AdminTitle />
      </LocaleProvider>
    );
    const title = screen.getByTestId('admin-title');
    // id admin.json is an identical copy of en for now.
    expect(idAdmin).toEqual(enAdmin);
    expect(title).toHaveTextContent(idAdmin.console_title);
    // No raw key path leaks into the DOM.
    expect(title.textContent).not.toContain('admin.console_title');
    expect(document.body.textContent).not.toContain('admin.console_title');
  });

  it('provides NextIntlClientProvider context (assertion moved from layout test)', () => {
    const providerSrc = fs.readFileSync(
      path.resolve(__dirname, '../locale-provider.tsx'),
      'utf-8'
    );
    expect(providerSrc).toContain('NextIntlClientProvider');
  });
});
