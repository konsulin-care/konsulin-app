import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import type { Patient } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useProfileSectionSave', () => ({
  useProfileSectionSave: vi.fn()
}));

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'id' }
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  const translate = createUseTranslationsMock();
  return {
    useTranslations: (namespace?: string) => {
      const t = translate(namespace);
      return (key: string, values?: Record<string, string | number>) => {
        if (key === 'remove_address_line') {
          return mockLocale.current === 'id'
            ? 'Hapus baris alamat'
            : 'Remove address line';
        }
        return t(key, values);
      };
    }
  };
});

vi.mock('@/services/api/cities', () => ({
  useGetProvinces: vi.fn(),
  useGetCities: vi.fn(),
  useGetDistricts: vi.fn()
}));

const mockUpdateLocale = vi.fn();
vi.mock('@/lib/locale', () => ({
  updateLocale: (...args: unknown[]) => mockUpdateLocale(...args)
}));

import { mockSectionSave } from '@/__tests__/mocks/section-save-mock';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import type { FhirResourceType } from '@/utils/role-fhir';
import AddressEditDrawer from '../address-edit-drawer';
import ContactEditDrawer from '../contact-edit-drawer';
import PersonalInfoEditDrawer from '../personal-info-edit-drawer';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John'], family: 'Doe' }]
};

describe('PersonalInfoEditDrawer', () => {
  const onClose = vi.fn();
  const mockSaveSection = vi.fn();

  type PersonalInfoOverrides = {
    fhirId?: string;
    resourceType?: FhirResourceType;
    gender?: string;
    birthDate?: string;
    languageCode?: string;
    supportsLanguage?: boolean;
  };

  /** Renders the drawer with Patient defaults; overrides applied per call. */
  function renderPersonalInfo(overrides: PersonalInfoOverrides = {}) {
    return render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId={overrides.fhirId ?? 'pat-1'}
        resourceType={overrides.resourceType ?? 'Patient'}
        gender={overrides.gender ?? 'male'}
        birthDate={overrides.birthDate ?? '1990-03-12'}
        languageCode={overrides.languageCode}
        supportsLanguage={overrides.supportsLanguage ?? true}
      />
    );
  }

  /** Selects female gender, English language, then saves. */
  function saveGenderAndLanguage(): void {
    fireEvent.change(screen.getByTestId('gender-select'), {
      target: { value: 'female' }
    });
    fireEvent.change(screen.getByTestId('language-select'), {
      target: { value: 'en' }
    });
    fireEvent.click(screen.getByText('Save'));
  }

  beforeEach(() => {
    mockSectionSave(mockSaveSection);
  });

  it('renders gender, DOB and language for Patient', () => {
    renderPersonalInfo();
    expect(screen.getByTestId('gender-select')).toBeDefined();
    expect(screen.getByTestId('language-select')).toBeDefined();
  });

  it('renders translated gender and language option labels', () => {
    renderPersonalInfo();
    const genderSelect = screen.getByTestId('gender-select');
    expect(within(genderSelect).getByText('Male')).toBeDefined();
    expect(within(genderSelect).getByText('Female')).toBeDefined();
    const languageSelect = screen.getByTestId('language-select');
    expect(within(languageSelect).getByText('Bahasa Indonesia')).toBeDefined();
    expect(within(languageSelect).getByText('English')).toBeDefined();
  });

  it('hides the language field when supportsLanguage is false', () => {
    renderPersonalInfo({
      fhirId: 'clinic-1',
      resourceType: 'Practitioner',
      gender: 'other',
      birthDate: '1978-11-20',
      supportsLanguage: false
    });
    expect(screen.queryByTestId('language-select')).toBeNull();
  });

  it('saves gender, DOB and language atomically', () => {
    renderPersonalInfo();
    saveGenderAndLanguage();

    expect(mockSaveSection).toHaveBeenCalledTimes(1);
    const params = mockSaveSection.mock.calls[0][0] as {
      merge: (latest: Patient) => Patient;
    };
    const merged = params.merge(patientFixture);
    expect(merged.gender).toBe('female');
    expect(merged.birthDate).toBe('1990-03-12');
    expect(merged.communication).toEqual([
      {
        language: {
          coding: [
            { system: 'urn:ietf:bcp:47', code: 'en', display: 'English' }
          ]
        }
      }
    ]);
  });

  it('does not pass mergeOtherRoles (language is synced via the main merge)', () => {
    renderPersonalInfo();
    saveGenderAndLanguage();

    const params = mockSaveSection.mock.calls[0][0] as {
      mergeOtherRoles?: (latest: Patient) => Patient;
    };
    expect(params.mergeOtherRoles).toBeUndefined();
  });

  it('writes the locale cookie after a successful save', async () => {
    renderPersonalInfo({ languageCode: 'en' });
    fireEvent.change(screen.getByTestId('language-select'), {
      target: { value: 'en' }
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateLocale).toHaveBeenCalledWith('en');
    });
  });

  it('does not save without gender and DOB', () => {
    renderPersonalInfo({ gender: '', birthDate: '' });
    fireEvent.click(screen.getByText('Save'));
    expect(mockSaveSection).not.toHaveBeenCalled();
  });
});

describe('ContactEditDrawer', () => {
  const onClose = vi.fn();
  const mockSaveSection = vi.fn();

  beforeEach(() => {
    mockSectionSave(mockSaveSection);
  });

  it('makes email read-only for email-based users', () => {
    render(
      <ContactEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        email='john@konsulin.care'
        phone='+628123456789'
        isEmailBased
      />
    );
    expect(screen.getByTestId('email-input')).toHaveAttribute('readonly');
    expect(screen.getByTestId('phone-input')).not.toHaveAttribute('readonly');
  });

  it('saves the telecom via the merge helper', () => {
    render(
      <ContactEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        email='john@konsulin.care'
        phone='+628123456789'
        isEmailBased={false}
      />
    );
    fireEvent.change(screen.getByTestId('phone-input'), {
      target: { value: '+628987654321' }
    });
    fireEvent.click(screen.getByText('Save'));

    const params = mockSaveSection.mock.calls[0][0] as {
      merge: (latest: Patient) => Patient;
    };
    const merged = params.merge(patientFixture);
    expect(merged.telecom).toEqual([
      { system: 'email', use: 'home', value: 'john@konsulin.care' },
      { system: 'phone', use: 'mobile', value: '+628987654321' }
    ]);
  });
});

describe('AddressEditDrawer', () => {
  const onClose = vi.fn();
  const mockSaveSection = vi.fn();

  type AddressOverrides = {
    line?: string[];
    district?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };

  /** Renders the drawer with a filled default address; overrides per call. */
  function renderAddress(overrides: AddressOverrides = {}) {
    return render(
      <AddressEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        line={overrides.line ?? ['Jl. Merdeka 12']}
        district={overrides.district ?? 'Kebayoran Baru'}
        city={overrides.city ?? 'Jakarta Selatan'}
        province={overrides.province ?? 'DKI Jakarta'}
        postalCode={overrides.postalCode ?? '12120'}
      />
    );
  }

  beforeEach(() => {
    mockLocale.current = 'id';
    mockSectionSave(mockSaveSection);
    vi.mocked(useGetProvinces).mockReturnValue({
      data: [{ code: '31', name: 'DKI Jakarta' }]
    } as never);
    vi.mocked(useGetCities).mockReturnValue({
      data: [{ code: '3174', name: 'Jakarta Selatan' }]
    } as never);
    vi.mocked(useGetDistricts).mockReturnValue({
      data: [{ code: '317401', name: 'Kebayoran Baru' }]
    } as never);
  });

  it('renders street, cascade selects and postal code', async () => {
    renderAddress();
    await waitFor(() => {
      expect(screen.getByTestId('line-0')).toHaveValue('Jl. Merdeka 12');
    });
    // LocationCombobox uses role='combobox'
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(3);
    expect(screen.getByTestId('postal-input')).toHaveValue('12120');
  });

  it('saves the address via the merge helper', async () => {
    renderAddress();
    fireEvent.change(screen.getByTestId('postal-input'), {
      target: { value: '12121' }
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockSaveSection).toHaveBeenCalledTimes(1));
    const params = mockSaveSection.mock.calls[0][0] as {
      merge: (latest: Patient) => Patient;
    };
    const merged = params.merge(patientFixture);
    expect(merged.address).toEqual([
      {
        use: 'home',
        type: 'physical',
        line: ['Jl. Merdeka 12'],
        district: 'Kebayoran Baru',
        city: 'Jakarta Selatan',
        state: 'DKI Jakarta',
        postalCode: '12121',
        country: 'ID'
      }
    ]);
  });

  it('uses LocationCombobox components for province, city, and district selection', async () => {
    renderAddress();

    await waitFor(() => {
      // Should have combobox role elements (LocationCombobox uses role='combobox')
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(3);
    });

    // Province combobox should show the selected province name
    expect(screen.getByText('DKI Jakarta')).toBeInTheDocument();
    expect(screen.getByText('Jakarta Selatan')).toBeInTheDocument();
    expect(screen.getByText('Kebayoran Baru')).toBeInTheDocument();

    // Native select elements should NOT exist
    expect(screen.queryByTestId('province-select')).toBeNull();
    expect(screen.queryByTestId('city-select')).toBeNull();
    expect(screen.queryByTestId('district-select')).toBeNull();
  });

  it('labels the remove-line button from remove_address_line in both locales', () => {
    mockLocale.current = 'id';
    const { unmount } = renderAddress({
      line: ['Jl. Merdeka 12', 'Jl. Sudirman 5'],
      district: '',
      city: '',
      province: '',
      postalCode: ''
    });
    expect(screen.getByTestId('remove-line-1')).toHaveAttribute(
      'aria-label',
      'Hapus baris alamat'
    );
    unmount();

    mockLocale.current = 'en';
    renderAddress({
      line: ['Jl. Merdeka 12', 'Jl. Sudirman 5'],
      district: '',
      city: '',
      province: '',
      postalCode: ''
    });
    expect(screen.getByTestId('remove-line-1')).toHaveAttribute(
      'aria-label',
      'Remove address line'
    );
  });

  it('hides city and district comboboxes when province is not selected', () => {
    renderAddress({
      line: [],
      district: '',
      city: '',
      province: '',
      postalCode: ''
    });

    // Only province combobox should be visible (city and district are hidden)
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(1);
  });
});
