import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Patient } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useProfileSectionSave', () => ({
  useProfileSectionSave: vi.fn()
}));

vi.mock('@/services/api/cities', () => ({
  useGetProvinces: vi.fn(),
  useGetCities: vi.fn(),
  useGetDistricts: vi.fn()
}));

import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import AddressEditDrawer from '../address-edit-drawer';
import ContactEditDrawer from '../contact-edit-drawer';
import { useProfileSectionSave } from '../hooks/useProfileSectionSave';
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSection.mockImplementation((params: { onSuccess?: () => void }) => {
      params.onSuccess?.();
    });
    vi.mocked(useProfileSectionSave).mockReturnValue({
      isSaving: false,
      saveSection: mockSaveSection
    });
  });

  it('renders gender, DOB and language for Patient', () => {
    render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        gender='male'
        birthDate='1990-03-12'
        languageCode='id'
        supportsLanguage
      />
    );
    expect(screen.getByTestId('gender-select')).toBeDefined();
    expect(screen.getByTestId('language-select')).toBeDefined();
  });

  it('hides the language field when supportsLanguage is false', () => {
    render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId='clinic-1'
        resourceType='Practitioner'
        gender='other'
        birthDate='1978-11-20'
        supportsLanguage={false}
      />
    );
    expect(screen.queryByTestId('language-select')).toBeNull();
  });

  it('saves gender, DOB and language atomically', () => {
    render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        gender='male'
        birthDate='1990-03-12'
        languageCode='id'
        supportsLanguage
      />
    );
    fireEvent.change(screen.getByTestId('gender-select'), {
      target: { value: 'female' }
    });
    fireEvent.change(screen.getByTestId('language-select'), {
      target: { value: 'en' }
    });
    fireEvent.click(screen.getByText('Save'));

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

  it('passes a mergeOtherRoles variant that keeps language per role', () => {
    render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        gender='male'
        birthDate='1990-03-12'
        languageCode='id'
        supportsLanguage
      />
    );
    fireEvent.change(screen.getByTestId('gender-select'), {
      target: { value: 'female' }
    });
    fireEvent.change(screen.getByTestId('language-select'), {
      target: { value: 'en' }
    });
    fireEvent.click(screen.getByText('Save'));

    const params = mockSaveSection.mock.calls[0][0] as {
      mergeOtherRoles?: (latest: Patient) => Patient;
    };
    expect(params.mergeOtherRoles).toBeTypeOf('function');
    const merged = params.mergeOtherRoles?.(patientFixture);
    expect(merged?.gender).toBe('female');
    expect(merged?.birthDate).toBe('1990-03-12');
    expect('communication' in (merged ?? {})).toBe(false);
  });

  it('does not save without gender and DOB', () => {
    render(
      <PersonalInfoEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        gender=''
        birthDate=''
        supportsLanguage
      />
    );
    fireEvent.click(screen.getByText('Save'));
    expect(mockSaveSection).not.toHaveBeenCalled();
  });
});

describe('ContactEditDrawer', () => {
  const onClose = vi.fn();
  const mockSaveSection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSection.mockImplementation((params: { onSuccess?: () => void }) => {
      params.onSuccess?.();
    });
    vi.mocked(useProfileSectionSave).mockReturnValue({
      isSaving: false,
      saveSection: mockSaveSection
    });
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSection.mockImplementation((params: { onSuccess?: () => void }) => {
      params.onSuccess?.();
    });
    vi.mocked(useProfileSectionSave).mockReturnValue({
      isSaving: false,
      saveSection: mockSaveSection
    });
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
    render(
      <AddressEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        line={['Jl. Merdeka 12']}
        district='Kebayoran Baru'
        city='Jakarta Selatan'
        province='DKI Jakarta'
        postalCode='12120'
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('line-0')).toHaveValue('Jl. Merdeka 12');
    });
    expect(screen.getByTestId('province-select')).toBeDefined();
    expect(screen.getByTestId('city-select')).toBeDefined();
    expect(screen.getByTestId('district-select')).toBeDefined();
    expect(screen.getByTestId('postal-input')).toHaveValue('12120');
  });

  it('saves the address via the merge helper', async () => {
    render(
      <AddressEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        line={['Jl. Merdeka 12']}
        district='Kebayoran Baru'
        city='Jakarta Selatan'
        province='DKI Jakarta'
        postalCode='12120'
      />
    );
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
});
