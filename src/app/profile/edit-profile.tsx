'use client';
/* eslint-disable max-lines -- TODO: refactor: split into smaller components */
import { LoadingSpinnerIcon } from '@/components/icons';
import DobCalendar from '@/components/profile/dob-calendar';
import ImageUploader from '@/components/profile/image-uploader';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { DRAWER_STATE, subtitle_success_updated } from '@/constants/profile';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import {
  getProfileById,
  modifyProfile,
  uploadAvatar,
  useUpdateProfile
} from '@/services/profile';
import { IWilayahResponse } from '@/types/wilayah';
import {
  dataUrlToBlob,
  findIdentifierValue,
  generateAvatarPlaceholder,
  isDataUrl,
  isValidImageUrl,
  mergeNames,
  parseFhirProfile
} from '@/utils/helper';
import { processImageForAvatar } from '@/utils/image-processing';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { validateEmail, validateForm, validateInput } from '@/utils/validation';
import { useQuery } from '@tanstack/react-query';

import ProfileFormSection from './profile-form-section';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Patient, Practitioner } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
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

  const { isLoading: isProfileLoading } = useQuery<Patient | Practitioner>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, fhirRole),
    enabled: Boolean(fhirId),
    onSuccess: result => {
      setUpdateUser(parseFhirProfile(result));
      setIsLoading(false);
    },
    onError: (error: Error) => {
      console.error('Error when fetching user profile: ', error);
      toast.error(error.message);
      setIsLoading(false);
    }
  });

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

  useEffect(() => {
    let isActive = true;

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

  const handleChangeInput = (label: string, value: string) => {
    setUpdateUser(prevState => ({ ...prevState, [label]: value }));
    const errorMessage = validateInput(label, value, isPhoneBasedUser);
    setErrors(prev => ({
      ...prev,
      [label]: errorMessage
    }));
  };

  const handlePhoneChange = (
    value: string,
    meta?: { country?: { dialCode?: string } }
  ) => {
    // Normalize phone to E.164-like: keep leading '+', digits; ensure country code is applied
    const dialCode = meta?.country?.dialCode ? `+${meta.country.dialCode}` : '';
    let cleaned = (value || '').replace(/[^\d+]/g, '');

    if (cleaned.startsWith('0') && dialCode) {
      cleaned = `${dialCode}${cleaned.slice(1)}`;
    } else if (cleaned.startsWith('+') && dialCode) {
      // Already has + prefix, no change needed
    } else if (dialCode) {
      cleaned = `${dialCode}${cleaned}`;
    }

    // Collapse duplicate leading pluses just in case
    cleaned = cleaned.replace(/^(\++)/, '+');

    handleChangeInput('phone', cleaned);
  };

  /** Builds FHIR telecom array from current user phone/email. */
  const buildTelecom = () => {
    const telecomArray: {
      system: 'phone' | 'email';
      use: 'mobile' | 'home';
      value: string;
    }[] = [];
    if (updateUser.phone?.trim()) {
      telecomArray.push({
        system: 'phone',
        use: 'mobile',
        value: updateUser.phone.trim()
      });
    }
    if (updateUser.email?.trim() && validateEmail(updateUser.email)) {
      telecomArray.push({
        system: 'email',
        use: 'home',
        value: updateUser.email.trim()
      });
    }
    return telecomArray;
  };

  /** Syncs Chatwoot contact identifier for the profile. */
  const syncChatwootIdentifier = async (
    latestProfile: FHIRProfile,
    existingChatwootId: string
  ) => {
    const trimmedName = [updateUser.firstName, updateUser.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();
    const authEmail = authState.userInfo?.email || '';
    const authPhone = authState.userInfo?.phoneNumber || '';
    const isEmailBased = Boolean(authEmail.trim());
    const isPhoneBased = Boolean(authPhone.trim());
    const emailForModifyProfile = (updateUser.email || authEmail).trim();
    const phoneForModifyProfile = (updateUser.phone || authPhone).trim();
    const shouldCall =
      trimmedName &&
      (isEmailBased
        ? emailForModifyProfile && validateEmail(emailForModifyProfile)
        : isPhoneBased && Boolean(phoneForModifyProfile));

    let finalChatwootId = existingChatwootId;
    if (shouldCall) {
      try {
        const { chatwootId } = await modifyProfile({
          name: trimmedName,
          ...(isEmailBased
            ? { email: emailForModifyProfile }
            : { phoneNumber: phoneForModifyProfile })
        });
        if (chatwootId && chatwootId !== existingChatwootId)
          finalChatwootId = chatwootId;
      } catch (error) {
        console.error(
          '[update-chatwoot-id] failed to ensure chatwoot_id exists',
          error
        );
      }
    }

    const identifiers = latestProfile?.identifier
      ? [...latestProfile.identifier]
      : [];
    const ensureIdentifier = (system: string, value: string) => {
      if (!system || !value) return;
      const exists = identifiers.find(id => id.system === system);
      if (exists) exists.value = value;
      else identifiers.push({ system, value });
    };
    ensureIdentifier('https://login.konsulin.care/userid', updateUser.userId);
    ensureIdentifier(
      'https://login.konsulin.care/chatwoot-id',
      finalChatwootId
    );

    return { finalChatwootId, identifiers };
  };

  /** Convert a MIME type to a file extension (jpg/png). */
  const getExtensionFromMime = (mime: string): string => {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime.includes('/')) return mime.split('/')[1];
    return 'png';
  };

  const processAvatarUpload = async (
    photoDataUrl: string,
    existingPhotoUrl: string,
    finalChatwootId: string
  ): Promise<string> => {
    if (!finalChatwootId) {
      console.error('[avatar] missing chatwoot_id, aborting upload', {
        fhirId
      });
      toast.error(
        'Profile does not own chatwoot_id; avatar update is cancelled'
      );
      return existingPhotoUrl;
    }
    setIsUploadingPhoto(true);
    try {
      const originalBlob = dataUrlToBlob(photoDataUrl);
      const mime = originalBlob.type || 'image/png';
      const ext = getExtensionFromMime(mime);
      const file = new File([originalBlob], `avatar.${ext}`, { type: mime });
      const processed = await processImageForAvatar(file, { outputType: mime });
      const fileForUpload = new File([processed.blob], `avatar.${ext}`, {
        type: processed.blob.type || mime
      });
      const uploadedUrl = await uploadAvatar(finalChatwootId, fileForUpload);
      if (!uploadedUrl)
        throw new Error('receive empty response from uploadAvatar');
      return uploadedUrl === existingPhotoUrl ? existingPhotoUrl : uploadedUrl;
    } catch (error) {
      const apiError = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      console.error('[avatar] upload error', {
        message: apiError?.message,
        status: apiError?.response?.status,
        response: apiError?.response?.data || error
      });
      toast.error('Failed updating the profile picture');
      return existingPhotoUrl;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /** Resolves and uploads profile photo if needed, returns final photo URL. */
  const resolvePhotoUrl = async (
    existingPhotoUrl: string,
    finalChatwootId: string
  ): Promise<string> => {
    if (isDataUrl(updateUser.photo)) {
      return processAvatarUpload(
        updateUser.photo,
        existingPhotoUrl,
        finalChatwootId
      );
    }

    if (updateUser.photo && isValidUrl(updateUser.photo)) {
      const parsed = new URL(updateUser.photo);
      if (
        ['http:', 'https:'].includes(parsed.protocol) &&
        updateUser.photo !== existingPhotoUrl
      ) {
        return updateUser.photo;
      }
    }
    return existingPhotoUrl || '';
  };

  /** Handles profile save: syncs Chatwoot, uploads photo, updates FHIR profile. */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleEditSave = async () => {
    let latestProfile: FHIRProfile = null;
    try {
      latestProfile = await getProfileById(fhirId, fhirRole);
    } catch (error) {
      console.error('Error when refetching user profile: ', error);
      toast.error('Failed to fetch the latest profile');
      return;
    }

    const existingPhotoUrl = latestProfile?.photo?.[0]?.url ?? '';
    const existingChatwootId = latestProfile
      ? findIdentifierValue(
          latestProfile,
          'https://login.konsulin.care/chatwoot-id'
        )
      : '';

    const { finalChatwootId, identifiers } = await syncChatwootIdentifier(
      latestProfile,
      existingChatwootId
    );
    const telecom = buildTelecom();
    const needsIdentifierSync =
      !existingChatwootId || existingChatwootId !== finalChatwootId;

    if (needsIdentifierSync) {
      if (!latestProfile) {
        toast.error('Failed updating profile');
        return;
      }
      try {
        await updateProfile({
          payload: { ...latestProfile, identifier: identifiers, telecom }
        });
      } catch (error) {
        console.error('Error when syncing chatwoot identifier: ', error);
        toast.error('Failed to sync profile to Konsulin Omnichannel');
        return;
      }
    }

    const photoUrlForPayload = await resolvePhotoUrl(
      existingPhotoUrl,
      finalChatwootId
    );
    if (isDataUrl(updateUser.photo) && !photoUrlForPayload) return;

    const splitName = (updateUser.firstName || '').split(' ').filter(Boolean);
    const familyName = updateUser.lastName?.trim() || undefined;

    const payload: Patient | Practitioner = {
      resourceType: updateUser.resourceType || fhirRole,
      id: updateUser.fhirId,
      active: updateUser.active,
      birthDate: updateUser.birthDate,
      gender: updateUser.gender,
      photo: photoUrlForPayload ? [{ url: photoUrlForPayload }] : [],
      identifier: identifiers,
      name: [
        {
          use: 'official',
          given: splitName,
          ...(familyName ? { family: familyName } : {})
        }
      ],
      address: [
        {
          use: 'home',
          type: 'physical',
          line: updateUser.addresses,
          district: updateUser.district,
          city: updateUser.city,
          postalCode: updateUser.postalCode,
          country: 'ID'
        }
      ],
      telecom
    };

    try {
      const result = await updateProfile({ payload });
      if (!result) return;

      const existing = authState.userInfo || {};
      const updatedPhotoUrl =
        result?.photo?.[0]?.url ||
        photoUrlForPayload ||
        existing.profile_picture;
      const updatedFullname =
        result.resourceType === 'Practitioner'
          ? mergeNames(result.name, result?.qualification)
          : mergeNames(result.name);

      const authPayload = {
        userId: existing.userId,
        roles: existing.roles || [existing.role_name || 'Patient'],
        role_name: existing.role_name,
        email: updateUser.email || existing.email,
        phoneNumber: updateUser.phone || existing.phoneNumber,
        fhirId: result.id || existing.fhirId,
        fullname: updatedFullname,
        profile_picture: updatedPhotoUrl,
        profile_complete: isProfileCompleteFromFHIR(result)
      };

      const csrfToken = await fetch('/auth/cookie/csrf-token')
        .then(r =>
          r.ok ? r.json() : Promise.reject(new Error('CSRF fetch failed'))
        )
        .then(d => (d as { token?: string }).token ?? '')
        .catch(() => '');
      const cookieRes = await fetch('/auth/cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        body: JSON.stringify(authPayload)
      });
      if (!cookieRes.ok) {
        throw new Error(`auth cookie set failed: ${cookieRes.status}`);
      }
      dispatchAuth({ type: 'auth-check', payload: authPayload });
      setDrawerState(DRAWER_STATE.SUCCESS);
    } catch (error) {
      console.error('Error when updating profile: ', error);
      toast.error('Failed updating the profile');
    }
  };

  /** Update birth date from date picker. */
  const handleDOBChange = (value: Date) => {
    setUpdateUser(prevState => ({
      ...prevState,
      birthDate: value ? format(value, 'yyyy-MM-dd') : ''
    }));
    setDrawerState(DRAWER_STATE.NONE);
  };

  /** Close the currently open drawer. */
  const closeDrawer = () => {
    setDrawerState(DRAWER_STATE.NONE);
  };

  /** Set gender from gender selection drawer. */
  const handleGenderSelect = (value: { code: string }) => {
    setUpdateUser(prevState => ({
      ...prevState,
      gender: value.code as ICustomProfile['gender']
    }));
  };

  const handleProvinceSelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      provinceCode: value.code,
      province: value.name,
      cityCode: '',
      city: ''
    }));
  };

  /** Set city/district/province from city selection drawer. */
  const handleCitySelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      cityCode: value.code,
      city: value.name,
      district: '',
      districtCode: ''
    }));
  };

  const handleDistrictSelect = (value: IWilayahResponse) => {
    setUpdateUser(prevState => ({
      ...prevState,
      district: value.name,
      districtCode: value.code
    }));
  };

  /** Update user photo URL. */
  const handleUserPhoto = (value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      photo: value
    }));
  };

  /** Add a new blank address field to the address list. */
  const handleAddAddress = () => {
    const newAddresses = Array.isArray(updateUser.addresses)
      ? [...updateUser.addresses, '']
      : [''];
    setUpdateUser(prev => ({ ...prev, addresses: newAddresses }));
  };

  /** Update address at the given index. */
  const handleAddressChange = (index: number, value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      addresses: Array.isArray(prevState.addresses)
        ? prevState.addresses.map((addr, i) => (i === index ? value : addr))
        : [value]
    }));
  };

  /** Remove address at the given index. */
  const handleRemoveAddress = (index: number) => {
    setUpdateUser(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  /** Format an ISO date string for display. */
  const formatDate = (dateObject: string) => {
    const date = new Date(dateObject);

    try {
      if (date instanceof Date) {
        return format(date, 'dd MMM yyyy', { locale: id });
      } else {
        return date;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

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
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
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
        <button
          className={`text-md border-primary mt-6 w-full rounded-full border-1 p-4 font-semibold ${validateForm(updateUser, isPhoneBasedUser) && !isUpdateLoading && !isUploadingPhoto ? 'bg-secondary text-white' : 'cursor-not-allowed bg-gray-300 text-gray-500'}`}
          type='submit'
          onClick={handleEditSave}
          disabled={
            !validateForm(updateUser, isPhoneBasedUser) ||
            isUpdateLoading ||
            isUploadingPhoto
          }
        >
          {isUpdateLoading || isUploadingPhoto ? (
            <LoadingSpinnerIcon
              width={20}
              height={20}
              className='w-full animate-spin'
            />
          ) : (
            'Simpan'
          )}
        </button>
      </div>

      <Drawer
        open={drawerState === DRAWER_STATE.DOB}
        onOpenChange={open => !open && closeDrawer()}
      >
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col p-4'>
          <DrawerHeader>
            <DrawerTitle />
            <DrawerDescription />
          </DrawerHeader>
          <DobCalendar
            value={updateUser.birthDate}
            onChange={handleDOBChange}
          />
        </DrawerContent>
      </Drawer>

      <Drawer
        open={drawerState === DRAWER_STATE.SUCCESS}
        onOpenChange={open => {
          if (!open && drawerState === DRAWER_STATE.SUCCESS) {
            router.push('/profile');
          } else if (!open) {
            closeDrawer();
          }
        }}
      >
        <DrawerTrigger />
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col'>
          <DrawerHeader>
            <DrawerTitle className='text-center text-xl font-bold text-[#2C2F35] opacity-100'>
              Changes Successful!
            </DrawerTitle>
            <DrawerDescription className='text-center text-sm text-[#2C2F35] opacity-60'>
              {subtitle_success_updated.split('\n').map(line => (
                <Fragment key={line}>
                  {line}
                  <br />
                </Fragment>
              ))}
            </DrawerDescription>
          </DrawerHeader>
          <button
            onClick={() => {
              closeDrawer();
              router.push('/profile');
            }}
            className='border-opacity-20 mx-4 mb-4 rounded-full border border-[#2C2F35] bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
