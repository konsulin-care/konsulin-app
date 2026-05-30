'use client';
/* eslint-disable max-lines -- TODO: refactor: split into smaller components */
import Input from '@/components/general/input';
import { LoadingSpinnerIcon } from '@/components/icons';
import DobCalendar from '@/components/profile/dob-calendar';
import DropdownProfile from '@/components/profile/dropdown-profile';
import ImageUploader from '@/components/profile/image-uploader';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import {
  DRAWER_STATE,
  genderList,
  subtitle_success_updated
} from '@/constants/profile';
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
import { validateEmail } from '@/utils/validation';
import { useQuery } from '@tanstack/react-query';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Patient, Practitioner } from 'fhir/r4';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import { PhoneInput } from 'react-international-phone';
import { toast } from 'react-toastify';

type Props = {
  userRole: string;
  fhirId: string;
};

type FHIRProfile = Patient | Practitioner | null;

type ICustomProfile = {
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
      const parsed = parseFhirProfile(result);

      if (parsed) {
        setUpdateUser(parsed);
      }
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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
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

  const validateName = (value: string, label: string): string => {
    const usernameRegex = /^[a-zA-Z ]+$/;
    if (!value) return `${label} cannot be empty`;
    if (!usernameRegex.test(value)) return `${label} format is invalid`;
    if (value.length < 2) return `${label} must be at least two characters`;
    return '';
  };

  const validateEmailField = (value: string): string => {
    if (!value || value.trim() === '') return 'Email is required';
    if (!validateEmail(value)) return 'Email format is invalid';
    return '';
  };

  const validateRequiredText = (value: string, label: string): string => {
    if (!value.trim()) return `${label} cannot be empty`;
    return '';
  };

  const RULES: Record<string, (v: string) => string> = {
    firstName: v => validateName(v, 'First name'),
    lastName: v => (v && v.trim() !== '' ? validateName(v, 'Last name') : ''),
    email: validateEmailField,
    phone: value => {
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      if (!value || value.trim() === '') return 'Phone number is required';
      if (!phoneRegex.test(value))
        return 'WhatsApp phone number must be 8-15 digits';
      return '';
    },
    addresses: value =>
      !Array.isArray(value) ||
      value.length === 0 ||
      value.every(part => !part.trim())
        ? 'Address cannot be empty'
        : '',
    city: v => validateRequiredText(v, 'City'),
    district: v => validateRequiredText(v, 'District'),
    province: v => validateRequiredText(v, 'Province'),
    postalCode: v => validateRequiredText(v, 'Postal code'),
    birthDate: value => (value ? '' : 'Birth date cannot be empty'),
    gender: value => (value ? '' : 'Gender cannot be empty')
  };

  const validateInput = (name: string, value: string): string => {
    if (name === 'email' && !isPhoneBasedUser) return '';
    if (name === 'phone' && isPhoneBasedUser) return '';
    return RULES[name]?.(value) ?? '';
  };

  const handleChangeInput = (label: string, value: string) => {
    setUpdateUser(prevState => ({ ...prevState, [label]: value }));
    const errorMessage = validateInput(label, value);
    setErrors(prev => ({
      ...prev,
      [label]: errorMessage
    }));
  };

  const validateForm = (data: ICustomProfile): boolean => {
    const errors: { [key: string]: string } = {};
    Object.entries(data).forEach(([key, value]) => {
      // Skip validation for fields that shouldn't be editable based on user type
      if (key === 'email' && !isPhoneBasedUser) {
        return; // Email-based users can't edit email, skip validation
      }
      if (key === 'phone' && isPhoneBasedUser) {
        return; // Phone-based users can't edit phone, skip validation
      }

      const error = validateInput(key, value as string);
      if (error) {
        errors[key] = error;
      }
    });

    return Object.keys(errors).length === 0;
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
    } else if (!cleaned.startsWith('+') && dialCode) {
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
      const fileForUpload =
        processed.blob instanceof File
          ? processed.blob
          : new File([processed.blob], `avatar.${ext}`, {
              type: processed.blob.type || mime
            });
      const uploadedUrl = await uploadAvatar(finalChatwootId, fileForUpload);
      if (!uploadedUrl)
        throw new Error('receive empty response from uploadAvatar');
      return uploadedUrl !== existingPhotoUrl ? uploadedUrl : existingPhotoUrl;
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
        email: existing.email,
        phoneNumber: existing.phoneNumber,
        fhirId: result.id || existing.fhirId,
        fullname: updatedFullname,
        profile_picture: updatedPhotoUrl,
        profile_complete: isProfileCompleteFromFHIR(result)
      };

      await fetch('/auth/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload)
      }).catch(err =>
        console.error('[auth:cookie] failed to set auth cookie', err)
      );
      dispatchAuth({ type: 'auth-check', payload: authPayload });
      setDrawerState(DRAWER_STATE.SUCCESS);
    } catch (error) {
      console.error('Error when updating profile: ', error);
      toast.error('Failed updating the profile');
    }
  };

  const handleDOBChange = (value: Date) => {
    setUpdateUser(prevState => ({
      ...prevState,
      birthDate: value ? format(value, 'yyyy-MM-dd') : ''
    }));
    setDrawerState(DRAWER_STATE.NONE);
  };

  const closeDrawer = () => {
    setDrawerState(DRAWER_STATE.NONE);
  };

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

  const handleUserPhoto = (value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      photo: value
    }));
  };

  const handleAddAddress = () => {
    const newAddresses = Array.isArray(updateUser.addresses)
      ? [...updateUser.addresses, '']
      : [''];
    setUpdateUser(prev => ({ ...prev, addresses: newAddresses }));
  };

  const handleAddressChange = (index: number, value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      addresses: Array.isArray(prevState.addresses)
        ? prevState.addresses.map((addr, i) => (i === index ? value : addr))
        : [value]
    }));
  };

  const handleRemoveAddress = (index: number) => {
    setUpdateUser(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

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
            <div className='flex flex-grow flex-col space-y-4'>
              <Input
                width={24}
                height={24}
                prefixIcon={'/icons/user-edit.svg'}
                placeholder='First Name'
                name='firstName'
                id='firstName'
                type='text'
                value={updateUser.firstName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleChangeInput('firstName', event.target.value)
                }
                opacity={false}
                outline={false}
                className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
              />
              {errors.firstName && (
                <p className='px-4 text-xs text-red-500'>{errors.firstName}</p>
              )}
              <Input
                width={24}
                height={24}
                prefixIcon={'/icons/user-edit.svg'}
                placeholder='Last Name'
                name='lastName'
                id='lastName'
                type='text'
                value={updateUser.lastName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleChangeInput('lastName', event.target.value)
                }
                opacity={false}
                outline={false}
                className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
              />
              {errors.lastName && (
                <p className='px-4 text-xs text-red-500'>{errors.lastName}</p>
              )}
              <Input
                width={24}
                height={24}
                prefixIcon={'/icons/email.svg'}
                placeholder='address@domain.tld'
                name='email'
                id='email'
                type='email'
                value={updateUser.email}
                readOnly={!isPhoneBasedUser}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleChangeInput('email', event.target.value)
                }
                opacity={false}
                outline={false}
                className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
              />
              {errors.email && (
                <p className='px-4 text-xs text-red-500'>{errors.email}</p>
              )}
              <div
                className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
                onClick={() => setDrawerState(DRAWER_STATE.DOB)}
              >
                <Image
                  src={'/icons/calendar-edit.png'}
                  alt='calendar-icon'
                  width={24}
                  height={24}
                />
                <div className='flex flex-grow justify-start text-sm'>
                  {updateUser.birthDate
                    ? formatDate(updateUser.birthDate)
                    : 'Date of Birth'}
                </div>
              </div>
              <div className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'>
                <PhoneInput
                  defaultCountry='id'
                  value={updateUser.phone}
                  onChange={handlePhoneChange}
                  placeholder='WhatsApp Number'
                  className='flex-1'
                  disabled={isPhoneBasedUser}
                  inputStyle={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    fontWeight: 'normal',
                    color: '#2C2F35',
                    ...(isPhoneBasedUser && {
                      cursor: 'not-allowed',
                      opacity: 0.6
                    })
                  }}
                />
              </div>
              {errors.phone && (
                <p className='px-4 text-xs text-red-500'>{errors.phone}</p>
              )}

              <DropdownProfile
                options={genderList}
                value={updateUser.gender}
                onSelect={handleGenderSelect}
                placeholder='Input your gender'
              />
              {errors.gender && (
                <p className='p-4 text-xs text-red-500'>{errors.gender}</p>
              )}

              <DropdownProfile
                options={listProvinces}
                value={updateUser.provinceCode}
                onSelect={handleProvinceSelect}
                placeholder='Province'
                loading={provinceLoading}
              />
              {errors.province && (
                <p className='p-4 text-xs text-red-500'>{errors.province}</p>
              )}

              {(updateUser.provinceCode || updateUser.city) && (
                <>
                  <DropdownProfile
                    options={listCities}
                    value={updateUser.cityCode}
                    onSelect={handleCitySelect}
                    placeholder='City'
                    labelPlaceholder={updateUser.city}
                    loading={cityLoading}
                  />
                  {errors.city && (
                    <p className='p-4 text-xs text-red-500'>{errors.city}</p>
                  )}
                </>
              )}

              {(updateUser.cityCode || updateUser.district) && (
                <>
                  <DropdownProfile
                    options={listDistricts}
                    value={updateUser.districtCode}
                    onSelect={handleDistrictSelect}
                    placeholder='District'
                    labelPlaceholder={updateUser.district}
                    loading={districtLoading}
                  />
                  {errors.district && (
                    <p className='p-4 text-xs text-red-500'>
                      {errors.district}
                    </p>
                  )}
                </>
              )}

              {updateUser.addresses?.map((addr: string, index: number) => (
                <div key={index} className='mb-2 flex items-center gap-2'>
                  <Input
                    width={24}
                    height={24}
                    prefixIcon={'/icons/location.svg'}
                    placeholder='Address'
                    name={`addresses-${index}`}
                    id={`addresses-${index}`}
                    type='text'
                    value={addr}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      handleAddressChange(index, event.target.value)
                    }
                    opacity={false}
                    outline={false}
                    className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
                  />
                  <button
                    type='button'
                    onClick={() => handleRemoveAddress(index)}
                    className='px-2 text-sm text-red-500'
                  >
                    <X />
                  </button>
                </div>
              ))}

              <div className='my-4 flex justify-center'>
                <p
                  className='cursor-pointer text-center text-sm font-normal'
                  onClick={handleAddAddress}
                >
                  + Add New Address
                </p>
              </div>

              <div className='flex w-full flex-grow flex-col justify-between space-x-2'>
                <div className='flex-1'>
                  <Input
                    width={24}
                    height={24}
                    prefixIcon={'/icons/location.svg'}
                    placeholder='Postal Code'
                    name='postalCode'
                    id='postalCode'
                    type='text'
                    value={updateUser.postalCode}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const onlyNumbers = event.target.value.replace(/\D/g, '');
                      handleChangeInput('postalCode', onlyNumbers);
                    }}
                    opacity={false}
                    outline={false}
                    className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
                  />
                  {errors.postalCode && (
                    <p className='px-4 text-xs text-red-500'>
                      {errors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        <button
          className={`text-md border-primary mt-6 w-full rounded-full border-1 p-4 font-semibold ${validateForm(updateUser) && !isUpdateLoading && !isUploadingPhoto ? 'bg-secondary text-white' : 'cursor-not-allowed bg-gray-300 text-gray-500'}`}
          type='submit'
          onClick={handleEditSave}
          disabled={
            !validateForm(updateUser) || isUpdateLoading || isUploadingPhoto
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
            <DrawerTitle></DrawerTitle>
            <DrawerDescription></DrawerDescription>
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
              {subtitle_success_updated.split('\n').map((line, index) => (
                <Fragment key={index}>
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
