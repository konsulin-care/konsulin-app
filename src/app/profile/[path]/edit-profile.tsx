'use client';
import { setCookies } from '@/app/actions';
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
import { getCookie } from 'cookies-next';
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

  const {
    mutateAsync: updateProfile,
    isLoading: isUpdateLoading,
    isError: isUpdateError
  } = useUpdateProfile();

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

  const validateInput = (name: string, value: string) => {
    let error = '';
    const usernameRegex = /^[a-zA-Z ]+$/;

    switch (name) {
      case 'firstName':
        if (!value) {
          error = 'First name cannot be empty';
        } else if (!usernameRegex.test(value)) {
          error = 'First name format is invalid';
        } else if (value.length < 2) {
          error = 'First name must be at least two characters';
        }
        break;
      case 'lastName':
        if (!usernameRegex.test(value)) {
          error = 'Last name format is invalid';
        } else if (value.length < 2) {
          error = 'Last name must be at least two characters';
        }
        break;
      case 'email':
        if (!value) {
          error = 'Email cannot be empty';
        } else if (!validateEmail(value)) {
          error = 'Email format is invalid';
        }
        break;
      case 'phone': {
        const phoneRegex = /^\+?[0-9]{8,15}$/;
        if (!value.trim()) {
          error = 'WhatsApp phone number cannot be empty';
        } else if (!phoneRegex.test(value)) {
          error = 'WhatsApp phone number must be 8-15 digits';
        }
        break;
      }

      case 'addresses':
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          value.every(part => !part.trim())
        ) {
          error = 'Address cannot be empty';
        }
        break;
      case 'city':
        if (!value.trim()) {
          error = 'City cannot be empty';
        }
        break;
      case 'district':
        if (!value.trim()) {
          error = 'District cannot be empty';
        }
        break;
      case 'province':
        if (!value.trim()) {
          error = 'Province cannot be empty';
        }
        break;
      case 'postalCode':
        if (!value.trim()) {
          error = 'Postal code cannot be empty';
        }
        break;
      case 'birthDate':
        if (!value) {
          error = 'Birth date cannot be empty';
        }
        break;
      case 'gender':
        if (!value) {
          error = 'Gender cannot be empty';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const handleChangeInput = (label: string, value: any) => {
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
      const error = validateInput(key, value as string);
      if (error) {
        errors[key] = error;
      }
    });

    return Object.keys(errors).length === 0;
  };

  const handlePhoneChange = (value: string, meta?: any) => {
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

  const handleEditSave = async () => {
    let latestProfile: Patient | Practitioner | null = null;
    let existingPhotoUrl = '';

    try {
      latestProfile = await getProfileById(fhirId, fhirRole);
      existingPhotoUrl = latestProfile?.photo?.[0]?.url ?? '';
    } catch (error) {
      console.error('Error when refetching user profile: ', error);
      toast.error('Failed to fetch the latest profile');

      return;
    }

    // only send a real URL; never send data URLs to FHIR
    let photoUrlForPayload = existingPhotoUrl || '';

    const existingChatwootId = latestProfile
      ? findIdentifierValue(
          latestProfile,
          'https://login.konsulin.care/chatwoot-id'
        )
      : '';

    let finalChatwootId = existingChatwootId;

    try {
      const { chatwootId: latestChatwootId } = await modifyProfile({
        email: updateUser.email,
        name: `${updateUser.firstName} ${updateUser.lastName}`.trim()
      });

      if (latestChatwootId && latestChatwootId !== existingChatwootId) {
        finalChatwootId = latestChatwootId;
      }
    } catch (error) {
      console.error(
        '[update-chatwoot-id] failed to ensure chatwoot_id exists and up to date',
        error
      );
    }

    let identifiers = Array.isArray(latestProfile?.identifier)
      ? [...latestProfile.identifier]
      : [];

    const ensureIdentifier = (system: string, value: string) => {
      if (!system || !value) return;
      const exists = identifiers.find(id => id.system === system);
      if (exists) {
        exists.value = value;
      } else {
        identifiers.push({ system, value });
      }
    };

    ensureIdentifier('https://login.konsulin.care/userid', updateUser.userId);
    ensureIdentifier(
      'https://login.konsulin.care/chatwoot-id',
      finalChatwootId
    );

    const needsIdentifierSync =
      !existingChatwootId || existingChatwootId !== finalChatwootId;

    // If chatwoot_id is missing or changed, sync identifiers first so avatar upload is accepted
    if (needsIdentifierSync) {
      if (!latestProfile) {
        toast.error('Failed updating profile');
        return;
      }

      try {
        await updateProfile({
          payload: {
            ...(latestProfile as Patient | Practitioner),
            identifier: identifiers
          }
        });
      } catch (error) {
        console.error('Error when syncing chatwoot identifier: ', error);
        toast.error('Failed to sync profile to Konsulin Omnichannel');
        return;
      }
    }

    if (!finalChatwootId) {
      console.error('[avatar] missing chatwoot_id, aborting upload', {
        fhirId,
        latestProfile
      });
      toast.error(
        'Profile does not own chatwoot_id; avatar update is cancelled'
      );
      setIsUploadingPhoto(false);
      return;
    }

    if (isDataUrl(updateUser.photo)) {
      try {
        setIsUploadingPhoto(true);
        const originalBlob = dataUrlToBlob(updateUser.photo);

        const mime = originalBlob.type || 'image/png';
        const ext =
          mime === 'image/jpeg'
            ? 'jpg'
            : mime?.includes('/')
              ? mime.split('/')[1]
              : 'png';

        const file = new File([originalBlob], `avatar.${ext}`, {
          type: mime
        });

        const processed = await processImageForAvatar(file, {
          outputType: mime
        });

        const fileForUpload =
          processed.blob instanceof File
            ? processed.blob
            : new File([processed.blob], `avatar.${ext}`, {
                type: processed.blob.type || mime
              });

        const uploadedUrl = await uploadAvatar(finalChatwootId, fileForUpload);
        if (!uploadedUrl) {
          throw new Error('receive empty response from uploadAvatar');
        }

        if (uploadedUrl && uploadedUrl !== existingPhotoUrl) {
          photoUrlForPayload = uploadedUrl;
        }
      } catch (error: any) {
        console.error('[avatar] upload error', {
          message: error?.message,
          status: (error as any)?.response?.status,
          response: (error as any)?.response?.data || error
        });
        toast.error('Failed updating the profile picture');

        return;
      } finally {
        setIsUploadingPhoto(false);
      }
    } else if (updateUser.photo && isValidUrl(updateUser.photo)) {
      // keep only http/https (avoid data URLs slipping in)
      const parsed = new URL(updateUser.photo);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        if (updateUser.photo !== existingPhotoUrl) {
          photoUrlForPayload = updateUser.photo;
        }
      }
    }

    const splitName = (updateUser.firstName || '').split(' ').filter(Boolean);

    const payload: Patient | Practitioner = {
      resourceType: updateUser.resourceType || fhirRole,
      id: updateUser.fhirId,
      active: updateUser.active,
      birthDate: updateUser.birthDate,
      gender: updateUser.gender,
      photo: photoUrlForPayload
        ? [
            {
              url: photoUrlForPayload
            }
          ]
        : [],
      identifier: identifiers,
      name: [
        {
          use: 'official',
          given: splitName,
          family: updateUser.lastName
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
      telecom: [
        {
          system: 'phone',
          use: 'mobile',
          value: updateUser.phone
        },
        {
          system: 'email',
          use: 'home',
          value: updateUser.email
        }
      ]
    };

    try {
      const result = await updateProfile({ payload });
      if (result) {
        let auth: any = {};
        try {
          auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));
        } catch {
          console.warn('Failed to parse auth cookie, starting fresh');
        }
        const updatedPhotoUrl =
          result?.photo?.[0]?.url || photoUrlForPayload || auth.profile_picture;
        auth.profile_picture = updatedPhotoUrl;
        auth.fullname =
          result.resourceType === 'Practitioner'
            ? mergeNames(result.name, result?.qualification)
            : mergeNames(result.name);

        auth.profile_complete = isProfileCompleteFromFHIR(result);
        await setCookies('auth', JSON.stringify(auth));
        dispatchAuth({ type: 'auth-check', payload: auth });

        setDrawerState(DRAWER_STATE.SUCCESS);
      }
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

  const handleGenderSelect = (value: any) => {
    setUpdateUser(prevState => ({
      ...prevState,
      gender: value.code
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
                onChange={(event: any) =>
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
                onChange={(event: any) =>
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
                readOnly
                onChange={(event: any) =>
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
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488'
                    stroke='#2C2F35'
                    strokeOpacity='0.4'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                <PhoneInput
                  defaultCountry='id'
                  value={updateUser.phone}
                  onChange={handlePhoneChange}
                  placeholder='WhatsApp Number'
                  className='flex-1'
                  inputStyle={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#2C2F35'
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
                    onChange={(event: any) =>
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
                    onChange={(event: any) => {
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
