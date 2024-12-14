import Input from '@/components/general/input'
import DobCalendar from '@/components/profile/dob-calendar'
import DropdownProfile from '@/components/profile/dropdown-profile'
import ImageUploader from '@/components/profile/image-uploader'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { DRAWER_STATE, subtitle_success_updated } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { PropsProfile } from '@/context/profile/profileTypes'
import { apiRequest } from '@/services/api'
import {
  ResponseProfile,
  fetchEducations,
  fetchGenders,
  fetchProfile
} from '@/services/profile'
import { validateEmail } from '@/utils/validation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Image from 'next/image'
import { Fragment, useEffect, useState } from 'react'

export default function EditProfile({ userRole }) {
  const { state, dispatch } = useProfile()
  const [updateUser, setUpdateUser] = useState<PropsProfile>({
    fullname: '',
    email: '',
    birth_date: '',
    whatsapp_number: '',
    gender: '',
    address: '',
    educations: [''],
    profile_picture: ''
  })
  const [drawerState, setDrawerState] = useState(DRAWER_STATE.NONE)
  const isPatient = userRole === 'patient'
  const isClinician = userRole === 'clinician'
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const { data: editProfile } = useQuery<ResponseProfile>({
    queryKey: ['edit-profile'],
    queryFn: () => fetchProfile(state, dispatch)
  })

  const { data: genderOptions } = useQuery({
    queryKey: ['genders'],
    queryFn: fetchGenders,
    staleTime: 1000 * 60 * 60 // will fresh after 1 hours
  })

  const { data: educationsOptions } = useQuery({
    queryKey: ['educations'],
    queryFn: fetchEducations,
    staleTime: 1000 * 60 * 60 // will fresh after 1 hours
  })

  const { mutate, isLoading } = useMutation({
    mutationFn: async (updateUser: PropsProfile) => {
      try {
        const response = await apiRequest(
          'PUT',
          '/api/v1/users/profile',
          updateUser
        )
        return response
      } catch (err) {
        throw err
      }
    },
    onSuccess: ({ updateUser }) => {
      dispatch({ type: 'updated', payload: { profile: updateUser } })
      setDrawerState(DRAWER_STATE.SUCCESS)
    }
  })

  useEffect(() => {
    if (editProfile) {
      const {
        fullname,
        email,
        birth_date,
        whatsapp_number,
        address,
        gender,
        educations,
        profile_picture
      } = editProfile.data
      setUpdateUser({
        fullname: fullname ?? '',
        email: email ?? '',
        birth_date: birth_date ?? '',
        whatsapp_number: whatsapp_number ?? '',
        gender: gender ?? '',
        address: address ?? '',
        educations: educations ?? [''],
        profile_picture: profile_picture
      })
    }
  }, [editProfile])

  function handleEducationSelect(value: string) {
    const selectedOption = educationsOptions.find(
      option => option.name === value
    )
    if (selectedOption && isPatient) {
      setUpdateUser(prev => ({
        ...prev,
        educations: [selectedOption.name]
      }))
    }
    if (selectedOption && isClinician) {
      setUpdateUser(prev => ({
        ...prev,
        educations: Array.isArray(prev.educations)
          ? [...prev.educations, selectedOption.name]
          : [selectedOption.name]
      }))
    }
  }

  function handleChangeInput(label: string, value: any) {
    setUpdateUser(prevState => ({ ...prevState, [label]: value }))
  }

  function handleAddEducationLevel() {
    const newEducation = updateUser.educations
      ? [...updateUser.educations, '']
      : ['']
    setUpdateUser(prevState => ({ ...prevState, educations: newEducation }))
  }

  function handleEducationChange(index: number, value: string) {
    setUpdateUser(prevState => ({
      ...prevState,
      educations: Array.isArray(prevState.educations)
        ? prevState.educations.map((edu, i) => (i === index ? value : edu))
        : [value]
    }))
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  async function handleEditSave() {
    const validationErrors = validateForm(updateUser)

    if (Object.keys(validationErrors).length === 0) {
      let base64ProfilePicture = updateUser.profile_picture

      if (isValidUrl(updateUser.profile_picture)) {
        base64ProfilePicture = await urlToBase64(updateUser.profile_picture)
      }

      const updatedProfile = {
        ...updateUser,
        profile_picture: base64ProfilePicture,
        birth_date: updateUser.birth_date
          ? format(new Date(updateUser.birth_date), 'yyyy-MM-dd')
          : undefined
      }

      mutate(updatedProfile)
    } else {
      setErrors(validationErrors)
    }
  }

  function handleDOBChange(value: any) {
    setUpdateUser(prevState => ({
      ...prevState,
      birth_date: value
    }))
    setDrawerState(DRAWER_STATE.NONE)
  }

  function closeDrawer() {
    setDrawerState(DRAWER_STATE.NONE)
  }

  function validateForm(user: PropsProfile) {
    const errors: { [key: string]: string } = {}
    const {
      fullname,
      email,
      whatsapp_number,
      address,
      birth_date,
      gender,
      educations
    } = user

    if (!fullname) {
      errors.fullname = 'Username is required'
    }

    if (!email) {
      errors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      errors.email = 'Valid email is required'
    }

    if (!whatsapp_number) {
      errors.whatsapp_number = 'Whatsapp number is required'
    }

    if (!address) {
      errors.address = 'Address is required'
    }

    if (!birth_date) {
      errors.birth_date = 'Birthdate is required'
    }

    if (!gender) {
      errors.gender = 'Gender is required'
    }

    if (educations && educations.length === 0) {
      errors.education = 'At least one education level is required'
    }

    return errors
  }

  function handleGenderSelect(value: string) {
    setUpdateUser(prevState => ({
      ...prevState,
      gender: value
    }))
  }

  function handleUserPhoto(value: string) {
    setUpdateUser(prevState => ({
      ...prevState,
      profile_picture: value
    }))
  }

  async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => {
        reject(new Error('Failed to convert URL to Base64'))
      }
      reader.readAsDataURL(blob)
    })
  }

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex flex-grow flex-col justify-between p-4'>
        <ImageUploader
          userPhoto={updateUser.profile_picture}
          onPhotoChange={handleUserPhoto}
        />
        <div className='flex flex-grow flex-col space-y-4'>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/user-edit.svg'}
            placeholder='Masukan Nama Lengkap'
            name='fullname'
            id='fullname'
            type='text'
            opacity={false}
            value={updateUser.fullname}
            onChange={(event: any) =>
              handleChangeInput('fullname', event.target.value)
            }
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.fullname && (
            <p className='px-4 text-xs text-red-500'>{errors.fullname}</p>
          )}
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/email.svg'}
            placeholder='Masukan Alamat Email'
            name='email'
            id='email'
            type='email'
            opacity={false}
            value={updateUser.email}
            onChange={(event: any) =>
              handleChangeInput('email', event.target.value)
            }
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
              {updateUser.birth_date
                ? format(updateUser.birth_date, 'yyyy-MM-dd')
                : 'Masukan Tanggal Lahir'}
            </div>
          </div>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/country-code.svg'}
            placeholder='Masukan Whatsapp Number'
            name='whatsapp_number'
            id='whatsapp_number'
            type='text'
            opacity={false}
            value={updateUser.whatsapp_number}
            onChange={(event: any) =>
              handleChangeInput('whatsapp_number', event.target.value)
            }
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.whatsapp_number && (
            <p className='px-4 text-xs text-red-500'>
              {errors.whatsapp_number}
            </p>
          )}
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/location.svg'}
            placeholder='Masukan Alamat'
            name='address'
            id='address'
            type='text'
            opacity={false}
            value={updateUser.address}
            onChange={(event: any) =>
              handleChangeInput('address', event.target.value)
            }
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.address && (
            <p className='px-4 text-xs text-red-500'>{errors.address}</p>
          )}
          {isPatient && (
            <div className='flex w-full flex-grow justify-between space-x-2'>
              <div className='flex-1 flex-col'>
                <DropdownProfile
                  options={genderOptions}
                  value={updateUser.gender}
                  onSelect={handleGenderSelect}
                  placeholder='Pilih Gender'
                />
                {errors.gender && (
                  <p className='p-4 text-xs text-red-500'>{errors.gender}</p>
                )}
              </div>
              <div className='flex-1 flex-col'>
                <DropdownProfile
                  options={educationsOptions}
                  value={updateUser.educations[0]}
                  onSelect={handleEducationSelect}
                  placeholder='Pilih Pendidikan'
                />
                {errors.educations && (
                  <p className='p-4 text-xs text-red-500'>
                    {errors.educations}
                  </p>
                )}
              </div>
            </div>
          )}
          {isClinician && (
            <>
              <div className='flex flex-col'>
                <DropdownProfile
                  options={genderOptions}
                  value={updateUser.gender}
                  onSelect={handleGenderSelect}
                  placeholder='Pilih Gender'
                />
                {errors.gender && (
                  <p className='px-4 text-xs text-red-500'>{errors.gender}</p>
                )}
              </div>

              {Array.isArray(updateUser.educations) &&
                updateUser.educations.map((edu, index) => (
                  <DropdownProfile
                    key={`${edu}-${index}`}
                    options={educationsOptions}
                    value={edu}
                    onSelect={value => handleEducationChange(index, value)}
                    placeholder='Pilih Pendidikan'
                  />
                ))}

              <div className='my-4 flex justify-center'>
                <p
                  className='cursor-pointer text-center text-sm font-normal'
                  onClick={handleAddEducationLevel}
                >
                  + Add Education Level
                </p>
              </div>
              {errors.educations && (
                <p className='px-4 text-xs text-red-500'>{errors.educations}</p>
              )}
            </>
          )}
        </div>
        <button
          className='text-md border-1 mt-4 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='submit'
          onClick={handleEditSave}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Simpan'}
        </button>
      </div>

      <Drawer
        open={drawerState === DRAWER_STATE.DOB}
        onOpenChange={open => !open && closeDrawer()}
      >
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='p-4'>
          <DrawerHeader>
            <DrawerTitle></DrawerTitle>
            <DrawerDescription></DrawerDescription>
          </DrawerHeader>
          <DobCalendar
            value={state.profile.birth_date}
            onChange={handleDOBChange}
          />
        </DrawerContent>
      </Drawer>

      <Drawer
        open={drawerState === DRAWER_STATE.SUCCESS}
        onOpenChange={open => !open && closeDrawer()}
      >
        <DrawerTrigger />
        <DrawerContent>
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
            onClick={closeDrawer}
            className='mx-4 mb-4 rounded-full border border-[#2C2F35] border-opacity-20 bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </button>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
