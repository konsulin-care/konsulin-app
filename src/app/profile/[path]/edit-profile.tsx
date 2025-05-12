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
import { useAuth } from '@/context/auth/authContext';
import {
  useGetCities,
  useGetDistricts,
  useGetProvinces
} from '@/services/api/cities';
import { getProfileById, useUpdateProfile } from '@/services/profile';
import { IWilayahResponse } from '@/types/wilayah';
import { mergeNames, parseFhirProfile } from '@/utils/helper';
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
  const { dispatch: dispatchAuth } = useAuth();
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
  // const isPatient = userRole === 'patient';
  // const isClinician = userRole === 'clinician';
  const fhirRole = userRole === 'patient' ? 'Patient' : 'Practitioner';
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { isLoading: isProfileLoading } = useQuery<Patient | Practitioner>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, fhirRole),
    onSuccess: result => {
      const parsed = parseFhirProfile(result);

      if (parsed) {
        setUpdateUser(parsed);
      }
    },
    onError: (error: Error) => {
      console.error('Error when fetching user profile: ', error);
      toast.error(error.message);
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

  const validateInput = (name: string, value: string) => {
    let error = '';
    const usernameRegex = /^[a-zA-Z ]+$/;

    switch (name) {
      case 'firstName':
        if (!value) {
          error = 'Nama depan pengguna tidak boleh kosong';
        } else if (!usernameRegex.test(value)) {
          error = 'Format nama depan pengguna tidak valid';
        } else if (value.length < 2) {
          error = 'Nama depan pengguna minimum 2 karakter';
        }
        break;
      case 'lastName':
        if (!usernameRegex.test(value)) {
          error = 'Format nama belakang pengguna tidak valid';
        } else if (value.length < 2) {
          error = 'Nama belakang pengguna minimum 2 karakter';
        }
        break;
      case 'email':
        if (!value) {
          error = 'Email tidak boleh kosong';
        } else if (!validateEmail(value)) {
          error = 'Format email tidak valid';
        }
        break;
      case 'phone':
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!value.trim()) {
          error = 'Nomor WhatsApp tidak boleh kosong';
        } else if (!phoneRegex.test(value)) {
          error = 'Nomor WhatsApp harus berupa angka 10-15 digit';
        }
        break;

      case 'addresses':
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          value.every(part => !part.trim())
        ) {
          error = 'Alamat tidak boleh kosong';
        }
        break;
      case 'city':
        if (!value.trim()) {
          error = 'Kota tidak boleh kosong';
        }
        break;
      case 'district':
        if (!value.trim()) {
          error = 'Kecamatan tidak boleh kosong';
        }
        break;
      case 'province':
        if (!value.trim()) {
          error = 'Provinsi tidak boleh kosong';
        }
        break;
      case 'postalCode':
        if (!value.trim()) {
          error = 'Kode pos tidak boleh kosong';
        }
        break;
      case 'birthDate':
        if (!value) {
          error = 'Tanggal lahir tidak boleh kosong';
        }
        break;
      case 'gender':
        if (!value) {
          error = 'Jenis kelamin tidak boleh kosong';
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

  const handleEditSave = async () => {
    // TODO: image uploader not finished yet
    let base64ProfilePicture = updateUser.photo;
    if (isValidUrl(updateUser.photo)) {
      base64ProfilePicture = await urlToBase64(updateUser.photo);
    }
    const updatedUser = {
      ...updateUser,
      photo: base64ProfilePicture
    };

    const splitName = updateUser.firstName.split(' ');

    const payload: Patient | Practitioner = {
      resourceType: updateUser.resourceType,
      id: updateUser.fhirId,
      active: updateUser.active,
      birthDate: updateUser.birthDate,
      gender: updateUser.gender,
      photo: [
        {
          url: ''
        }
      ],
      identifier: [
        {
          system: 'https://login.konsulin.care/userid',
          value: updateUser.userId
        }
      ],
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

    const result = await updateProfile({ payload });
    if (!isUpdateError && result) {
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));
      auth.profile_picture = result.photo[0].url;
      auth.fullname =
        result.resourceType === 'Practitioner'
          ? mergeNames(result.name, result?.qualification)
          : mergeNames(result.name);
      await setCookies('auth', JSON.stringify(auth));
      dispatchAuth({ type: 'auth-check', payload: auth });

      setDrawerState(DRAWER_STATE.SUCCESS);
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

  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert URL to Base64'));
      };
      reader.readAsDataURL(blob);
    });
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

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex flex-grow flex-col justify-between p-4'>
        {isProfileLoading ? (
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
              userPhoto={updateUser.photo}
              onPhotoChange={handleUserPhoto}
            />
            <div className='flex flex-grow flex-col space-y-4'>
              <Input
                width={24}
                height={24}
                prefixIcon={'/icons/user-edit.svg'}
                placeholder='Masukan Nama Depan'
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
                placeholder='Masukan Nama Belakang'
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
                placeholder='Masukan Alamat Email'
                name='email'
                id='email'
                type='email'
                value={updateUser.email}
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
                    : 'Masukan Tanggal Lahir'}
                </div>
              </div>
              <Input
                width={24}
                height={24}
                prefixIcon={'/icons/country-code.svg'}
                placeholder='Masukan Whatsapp Number'
                name='phone'
                id='phone'
                type='text'
                value={updateUser.phone}
                onChange={(event: any) => {
                  const onlyNumbers = event.target.value.replace(/\D/g, '');
                  handleChangeInput('phone', onlyNumbers);
                }}
                opacity={false}
                outline={false}
                className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
              />
              {errors.phone && (
                <p className='px-4 text-xs text-red-500'>{errors.phone}</p>
              )}

              <DropdownProfile
                options={genderList}
                value={updateUser.gender}
                onSelect={handleGenderSelect}
                placeholder='Pilih Gender'
              />
              {errors.gender && (
                <p className='p-4 text-xs text-red-500'>{errors.gender}</p>
              )}

              <DropdownProfile
                options={listProvinces}
                value={updateUser.provinceCode}
                onSelect={handleProvinceSelect}
                placeholder='Pilih Provinsi'
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
                    placeholder='Pilih Kota'
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
                    placeholder='Pilih Kecamatan'
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
                    placeholder='Masukan Alamat'
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
                    placeholder='Masukan Kode pos'
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
          className={`text-md border-1 mt-6 w-full rounded-full border-primary p-4 font-semibold ${validateForm(updateUser) && !isUpdateLoading ? 'bg-secondary text-white' : 'cursor-not-allowed bg-gray-300 text-gray-500'}`}
          type='submit'
          onClick={handleEditSave}
          disabled={!validateForm(updateUser) || isUpdateLoading}
        >
          {isUpdateLoading ? (
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
            className='mx-4 mb-4 rounded-full border border-[#2C2F35] border-opacity-20 bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
