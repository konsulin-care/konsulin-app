'use client';
import { LoadingSpinnerIcon } from '@/components/icons';
import ImageUploader from '@/components/profile/image-uploader';
import { DRAWER_STATE } from '@/constants/profile';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useProfileEditDraft } from '@/hooks/useProfileEditDraft';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import {
  getProfileById,
  useUpdateProfile
} from '@/services/profile';
import { validateForm } from '@/utils/validation';
import {
  generateAvatarPlaceholder,
  isDataUrl,
  isValidImageUrl,
  parseFhirProfile
} from '@/utils/helper';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { EditProfileSaveButton } from './edit-profile-save-button';
import { EditProfileDrawers } from './edit-profile-drawers';
import { useAvatarUpload } from './hooks/useAvatarUpload';
import { useProfileFormHandlers } from './hooks/useProfileFormHandlers';
import { useProfileSave } from './hooks/useProfileSave';
import ProfileFormSection from './profile-form-section';

import { Patient, Practitioner } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  userRole: string;
  fhirId: string;
};

type FHIRProfile = Patient | Practitioner | null;

export type ICustomProfile = {
  fhirId: string;
  resourceType: 'Patient' | 'Practitioner';
  active: boolean;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  photo: string;
  userId: string;
  firstName: string;
  lastName: string;
  addresses: string[];
  cityCode: string;
  city: string;
  district: string;
  districtCode: string;
  provinceCode: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
};

/** Full-screen loading spinner shown while profile data is being fetched. */
const ProfileLoadingState = () => (
  <div className='flex min-h-screen min-w-full items-center justify-center'>
    <LoadingSpinnerIcon
      width={56}
      height={56}
      className='w-full animate-spin'
    />
  </div>
);

/** Profile edit page with personal info, photo, gender, city, addresses. */
export default function EditProfile({ userRole, fhirId }: Props) {
  const router = useRouter();
  const { state: authState, dispatch: dispatchAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [updateUser, setUpdateUser] = useState<ICustomProfile>({
    fhirId: '',
    resourceType: null,
    active: false,
    birthDate: '',
    gender: null,
    photo: '',
    userId: '',
    firstName: '',
    lastName: '',
    addresses: [],
    cityCode: '',
    city: '',
    district: '',
    districtCode: '',
    provinceCode: '',
    province: '',
    postalCode: '',
    phone: '',
    email: ''
  });
  const [drawerState, setDrawerState] = useState(DRAWER_STATE.NONE);
  const fhirRole =
    userRole === Roles.Patient ? Roles.Patient : Roles.Practitioner;
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  /** Check if the user is phone-only (no email). */
  const getInitialPhoneBasedUser = () => {
    const email = authState.userInfo?.email || '';
    const phoneNumber = authState.userInfo?.phoneNumber || '';
    return Boolean(phoneNumber) && !email;
  };
  const [isPhoneBasedUser] = useState<boolean>(getInitialPhoneBasedUser);
  const queryClient = useQueryClient();

  const { initialDraft, saveDraft, clearDraft } = useProfileEditDraft(fhirId);
  const draftRef = useRef<Record<string, unknown> | null>(null);

  const { isLoading: isProfileLoading } = useQuery<Patient | Practitioner>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, fhirRole),
    enabled: Boolean(fhirId),
    onSuccess: result => {
      const parsed = parseFhirProfile(result);
      setUpdateUser(
        draftRef.current ? { ...parsed, ...draftRef.current } : parsed
      );
      setIsLoading(false);
    },
    onError: (error: Error) => {
      console.error('Error when fetching user profile: ', error);
      toast.error(error.message);
      setIsLoading(false);
    }
  });

  useEffect(() => {
    draftRef.current = initialDraft;
    if (initialDraft && !isProfileLoading) {
      setUpdateUser(prev => ({ ...prev, ...initialDraft }));
    }
  }, [initialDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutateAsync: updateProfile, isLoading: isUpdateLoading } =
    useUpdateProfile();

  const { data: listProvinces, isLoading: provinceLoading } = useGetProvinces();
  const { data: listCities, isLoading: cityLoading } = useGetCities(
    Number(updateUser.provinceCode)
  );
  const { data: listDistricts, isLoading: districtLoading } = useGetDistricts(
    Number(updateUser.cityCode)
  );

  /** Check if a string is a valid URL. */
  const isValidUrl = (url: string): boolean => {
    try {
      return URL.canParse(url);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!updateUser.addresses || updateUser.addresses.length === 0) {
      setUpdateUser(prev => ({
        ...prev,
        addresses: ['']
      }));
    }
  }, [updateUser.addresses]);

  /** Debounced auto-save profile edits to localStorage. */
  useEffect(() => {
    if (isLoading || isProfileLoading) return undefined;
    const timer = setTimeout(() => {
      saveDraft(updateUser);
    }, 1000);
    return () => clearTimeout(timer);
  }, [updateUser, isLoading, isProfileLoading, saveDraft]);

  useEffect(() => {
    let isActive = true;

    /** Validate the current photo URL and resolve to displayable URL. */
    const validatePhoto = async () => {
      if (!updateUser.photo) {
        if (isActive) setResolvedPhotoUrl('');
        return;
      }

      if (isDataUrl(updateUser.photo)) {
        if (isActive) setResolvedPhotoUrl(updateUser.photo);
        return;
      }

      const valid = await isValidImageUrl(updateUser.photo);
      if (!isActive) return;
      setResolvedPhotoUrl(valid ? updateUser.photo : '');
    };

    validatePhoto();

    return () => {
      isActive = false;
    };
  }, [updateUser.photo]);

  const {
    handleChangeInput,
    handlePhoneChange,
    handleDOBChange,
    closeDrawer,
    handleGenderSelect,
    handleProvinceSelect,
    handleCitySelect,
    handleDistrictSelect,
    handleUserPhoto,
    handleAddAddress,
    handleAddressChange,
    handleRemoveAddress,
    formatDate
  } = useProfileFormHandlers({
    updateUser,
    isPhoneBasedUser,
    setUpdateUser,
    setErrors,
    setDrawerState
  });

  const { processAvatarUpload, resolvePhotoUrl } = useAvatarUpload({
    photo: updateUser.photo,
    fhirId,
    setIsUploadingPhoto
  });

  const { handleEditSave } = useProfileSave({
    updateUser,
    fhirId,
    fhirRole: fhirRole as 'Patient' | 'Practitioner',
    authState,
    resolvePhotoUrl,
    isValidUrl,
    updateProfile,
    clearDraft,
    dispatchAuth: dispatchAuth as (action: { type: string; payload: unknown }) => void,
    queryClient,
    setDrawerState
  });

  const { initials, backgroundColor } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email,
    userId: authState.userInfo?.userId || updateUser.userId
  });

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex flex-grow flex-col justify-between p-4'>
        {isLoading || isProfileLoading ? (
          <ProfileLoadingState />
        ) : (
          <>
            <ImageUploader
              userPhoto={resolvedPhotoUrl || updateUser.photo}
              onPhotoChange={handleUserPhoto}
              initials={initials}
              backgroundColor={backgroundColor}
            />
            <ProfileFormSection
              updateUser={updateUser}
              errors={errors}
              listProvinces={listProvinces}
              listCities={listCities}
              listDistricts={listDistricts}
              isPhoneBasedUser={isPhoneBasedUser}
              provinceLoading={provinceLoading}
              cityLoading={cityLoading}
              districtLoading={districtLoading}
              handleChangeInput={handleChangeInput}
              handlePhoneChange={handlePhoneChange}
              handleProvinceSelect={handleProvinceSelect}
              handleCitySelect={handleCitySelect}
              handleDistrictSelect={handleDistrictSelect}
              handleGenderSelect={handleGenderSelect}
              handleAddressChange={handleAddressChange}
              handleRemoveAddress={handleRemoveAddress}
              handleAddAddress={handleAddAddress}
              formatDate={formatDate}
              setDrawerState={setDrawerState}
            />
          </>
        )}
        <EditProfileSaveButton
          isValid={validateForm(updateUser, isPhoneBasedUser)}
          isUpdateLoading={isUpdateLoading}
          isUploadingPhoto={isUploadingPhoto}
          onSave={handleEditSave}
        />
      </div>

      <EditProfileDrawers
        drawerState={drawerState}
        birthDate={updateUser.birthDate}
        onDOBChange={handleDOBChange}
        onCloseDrawer={closeDrawer}
        onSuccessClose={() => {
          closeDrawer();
          router.push('/profile');
        }}
      />
    </div>
  );
}
