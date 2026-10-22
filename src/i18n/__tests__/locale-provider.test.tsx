import { mockSectionSave } from '@/__tests__/mocks/section-save-mock';
import PersonalInfoEditDrawer from '@/app/profile/personal-info-edit-drawer';
import DropdownProfile from '@/components/profile/dropdown-profile';
import enAdmin from '@/messages/en/admin.json';
import enProfile from '@/messages/en/profile.json';
import enToast from '@/messages/en/toast.json';
import idAdmin from '@/messages/id/admin.json';
import idProfile from '@/messages/id/profile.json';
import idToast from '@/messages/id/toast.json';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { updateLocale } from '@/lib/locale';

import { LocaleProvider } from '../locale-provider';

vi.mock('@/app/profile/hooks/useProfileSectionSave', () => ({
  useProfileSectionSave: vi.fn()
}));

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

  it('re-renders translated text and updates document lang on updateLocale without a reload', () => {
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
      updateLocale('en');
    });
    expect(label).toHaveTextContent('Save');
    expect(document.documentElement.lang).toBe('en');
    expect(counter).toHaveTextContent('1');
    expect(window.location.href).toBe(hrefBefore);

    act(() => {
      updateLocale('id');
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

// ---------------------------------------------------------------------------
// End-to-end flow: the manual visual check (T9) automated against the real
// provider, real message files and the real personal-info drawer.
// ---------------------------------------------------------------------------

describe('End-to-end locale flow (manual check automated)', () => {
  const mockSaveSection = vi.fn();

  beforeEach(() => {
    clearLocaleCookie();
    mockSectionSave(mockSaveSection);
  });

  it('renders Indonesian by default and switches to English on save without a reload', () => {
    const hrefBefore = window.location.href;
    render(
      <LocaleProvider>
        <PersonalInfoEditDrawer
          open
          onClose={vi.fn()}
          fhirId='pat-1'
          resourceType='Patient'
          gender='male'
          birthDate='1990-03-12'
          languageCode='id'
          supportsLanguage
        />
      </LocaleProvider>
    );

    // Step 1: no NEXT_LOCALE cookie -> Indonesian by default.
    const genderSelect = screen.getByTestId('gender-select');
    const languageSelect = screen.getByTestId('language-select');
    expect(within(genderSelect).getByText('Laki-laki')).toBeDefined();
    expect(within(genderSelect).getByText('Perempuan')).toBeDefined();
    expect(within(languageSelect).getByText('Bahasa Indonesia')).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Tanggal' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Bulan' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Tahun' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDefined();
    expect(document.documentElement.lang).toBe('id');

    // Step 2: the user picks English as preferred language and saves.
    fireEvent.change(languageSelect, { target: { value: 'en' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    // Step 3: same DOM nodes, now English — no hard refresh.
    expect(screen.getByTestId('gender-select')).toBe(genderSelect);
    expect(within(genderSelect).getByText('Male')).toBeDefined();
    expect(within(genderSelect).getByText('Female')).toBeDefined();
    expect(within(languageSelect).getByText('English')).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Day' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Month' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Year' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(window.location.href).toBe(hrefBefore);
  });

  it('follows the locale when switching back to Indonesian', () => {
    clearLocaleCookie();
    render(
      <LocaleProvider>
        <DropdownProfile
          options={[]}
          value=''
          placeholder=''
          labelPlaceholder=''
          onSelect={vi.fn()}
        />
      </LocaleProvider>
    );
    expect(screen.getByText('Pilih opsi')).toBeDefined();

    act(() => {
      updateLocale('en');
    });
    expect(screen.getByText('Select option')).toBeDefined();

    act(() => {
      updateLocale('id');
    });
    expect(screen.getByText('Pilih opsi')).toBeDefined();
    expect(document.documentElement.lang).toBe('id');
  });

  it('keeps address and avatar chrome strings aligned with both locales', () => {
    // Address delete-line control, edit-name control and avatar failure toast
    // are covered component-side by the profile tests; the message files pin
    // the exact strings the manual check verifies.
    expect(idProfile.remove_address_line).toBe('Hapus baris alamat');
    expect(enProfile.remove_address_line).toBe('Remove address line');
    expect(idProfile.edit_name).toBe('Ubah nama');
    expect(enProfile.edit_name).toBe('Edit name');
    expect(idToast.photo_update_failed).toBe('Gagal memperbarui foto profil');
    expect(enToast.photo_update_failed).toBe('Failed to update profile photo');
  });
});
