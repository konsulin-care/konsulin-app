import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useProfileEditDraft', () => ({
  useProfileEditDraft: () => ({
    initialDraft: null,
    saveDraft: vi.fn(),
    clearDraft: vi.fn()
  })
}));

vi.mock('@/services/api/cities', () => ({
  useGetProvinces: vi.fn(),
  useGetCities: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useGetDistricts: vi.fn().mockReturnValue({ data: [], isLoading: false })
}));

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  useUpdateProfile: () => ({
    mutateAsync: vi.fn(),
    isLoading: false
  })
}));

vi.mock('@/utils/helper', () => ({
  parseFhirProfile: vi.fn(),
  generateAvatarPlaceholder: vi.fn().mockReturnValue({
    initials: 'JD',
    backgroundColor: '#13c2c2'
  }),
  isDataUrl: vi.fn().mockReturnValue(false),
  isValidImageUrl: vi.fn().mockResolvedValue(true)
}));

vi.mock('@/utils/validation', () => ({
  validateForm: vi.fn().mockReturnValue(true),
  validateInput: vi.fn().mockReturnValue('')
}));

vi.mock('@/app/profile/hooks/useAvatarUpload', () => ({
  useAvatarUpload: () => ({ resolvePhotoUrl: vi.fn() })
}));

vi.mock('@/app/profile/hooks/useProfileFormHandlers', () => ({
  useProfileFormHandlers: vi.fn().mockReturnValue({
    handleChangeInput: vi.fn(),
    handlePhoneChange: vi.fn(),
    handleDOBChange: vi.fn(),
    closeDrawer: vi.fn(),
    handleGenderSelect: vi.fn(),
    handleProvinceSelect: vi.fn(),
    handleCitySelect: vi.fn(),
    handleDistrictSelect: vi.fn(),
    handleUserPhoto: vi.fn(),
    handleAddAddress: vi.fn(),
    handleAddressChange: vi.fn(),
    handleRemoveAddress: vi.fn(),
    formatDate: vi.fn()
  })
}));

vi.mock('@/app/profile/hooks/useProfileSave', () => ({
  useProfileSave: () => ({ handleEditSave: vi.fn() })
}));

vi.mock('@/components/profile/image-uploader', () => ({
  default: () => <div data-testid='image-uploader' />
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner' />
}));

vi.mock('@/app/profile/profile-form-section', () => ({
  default: () => <div data-testid='profile-form-section' />
}));

vi.mock('@/app/profile/edit-profile-save-button', () => ({
  EditProfileSaveButton: () => <div data-testid='save-button' />
}));

vi.mock('@/app/profile/edit-profile-drawers', () => ({
  EditProfileDrawers: () => <div data-testid='edit-drawers' />
}));

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...(actual as Record<string, unknown>),
    useQuery
  };
});

import { createQueryClient, mockAuth } from '@/__tests__/test-utils';
import { useAuth } from '@/context/auth/authContext';
import { useGetProvinces } from '@/services/api/cities';
import { parseFhirProfile } from '@/utils/helper';

import EditProfile from '../edit-profile';

describe('EditProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth(vi.mocked(useAuth), {
      fhirId: 'pat-1',
      role_name: 'Patient',
      email: 'test@example.com',
      phoneNumber: '+628123456789'
    });

    vi.mocked(parseFhirProfile).mockReturnValue({
      fhirId: 'pat-1',
      resourceType: 'Patient',
      active: true,
      birthDate: '1990-01-15',
      gender: 'male',
      photo: '',
      userId: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      addresses: [],
      cityCode: '',
      city: '',
      district: '',
      districtCode: '',
      provinceCode: '',
      province: '',
      postalCode: '',
      phone: '+628123456789',
      email: 'test@example.com'
    });

    vi.mocked(useGetProvinces).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null
    } as unknown as ReturnType<typeof useGetProvinces>);

    vi.mocked(useQuery).mockReturnValue({
      data: {
        id: 'pat-1',
        resourceType: 'Patient',
        name: [{ given: ['John'], family: 'Doe' }]
      },
      isLoading: false,
      isError: false
    });
  });

  const renderComponent = () => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <EditProfile userRole='Patient' fhirId='pat-1' />
      </QueryClientProvider>
    );
  };

  it('renders profile form after data loads', () => {
    renderComponent();
    expect(screen.getByTestId('profile-form-section')).toBeDefined();
  });

  it('renders save button', () => {
    renderComponent();
    expect(screen.getByTestId('save-button')).toBeDefined();
  });
});
