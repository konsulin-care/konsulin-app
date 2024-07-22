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
import {
  DRAWER_STATE,
  educationLists,
  genderOptions,
  subtitle_success_updated
} from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { apiRequest } from '@/services/api'
import { ResponseProfile, fetchProfile } from '@/services/profile'
import { validateEmail } from '@/utils/validation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Image from 'next/image'
import { Fragment, useEffect, useState } from 'react'

type UpdateUser = {
  birth_date: string
  fullname: string
  email: string
  whatsapp_number: string
  gender: string
  address: string
  education: string[] | string
}

export default function EditProfile({ userRole }) {
  const { state, dispatch } = useProfile()
  const [updateUser, setUpdateUser] = useState<UpdateUser>({
    fullname: '',
    email: '',
    birth_date: '',
    whatsapp_number: '',
    gender: '',
    address: '',
    education: []
  })
  const [userPhoto, setUserPhoto] = useState('/images/sample-foto.svg')
  const [drawerState, setDrawerState] = useState(DRAWER_STATE.NONE)
  const isPatient = userRole === 'patient'
  const isClinician = userRole === 'clinician'
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const { data: editProfile } = useQuery<ResponseProfile>({
    queryKey: ['edit-profile'],
    queryFn: () => fetchProfile(state, dispatch)
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (updateUser: UpdateUser) => {
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
        sex, // Need confirmation to BE for change key from sex to gender
        education
      } = editProfile.data
      setUpdateUser({
        fullname: fullname || '',
        email: email || '',
        birth_date: birth_date || '',
        whatsapp_number: whatsapp_number || '',
        gender: sex || '',
        address: address || '',
        education: [education]
      })
    }
  }, [editProfile])

  function handleEducationSelect(value: string) {
    const selectedOption = educationLists.find(option => option.value === value)
    if (selectedOption && isPatient) {
      setUpdateUser(prev => ({
        ...prev,
        education: [selectedOption.value]
      }))
    }
    if (selectedOption && isClinician) {
      setUpdateUser(prev => ({
        ...prev,
        education: Array.isArray(prev.education)
          ? [...prev.education, selectedOption.value]
          : [selectedOption.value]
      }))
    }
  }

  function handleChangeInput(label: string, value: any) {
    setUpdateUser(prevState => ({ ...prevState, [label]: value }))
  }

  function handleAddEducationLevel() {
    const newEducation = Array.isArray(updateUser.education)
      ? [...updateUser.education, '']
      : ['']
    setUpdateUser(prevState => ({ ...prevState, education: newEducation }))
  }

  function handleEducationChange(index: number, value: string) {
    setUpdateUser(prevState => ({
      ...prevState,
      education: Array.isArray(prevState.education)
        ? prevState.education.map((edu, i) => (i === index ? value : edu))
        : [value]
    }))
  }

  function handleEditSave() {
    const validationErrors = validateForm(updateUser)

    if (Object.keys(validationErrors).length === 0) {
      const updatedProfile = {
        ...updateUser,
        education: isPatient ? updateUser.education[0] : updateUser.education,
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

  function validateForm(user: UpdateUser) {
    const errors: { [key: string]: string } = {}
    const {
      fullname,
      email,
      whatsapp_number,
      address,
      birth_date,
      gender,
      education
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

    if (typeof education === 'string' && education.trim() === '') {
      errors.education = 'Education is required'
    } else if (Array.isArray(education) && education.length === 0) {
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

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex flex-grow flex-col justify-between p-4'>
        <ImageUploader userPhoto={userPhoto} onPhotoChange={setUserPhoto} />
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
                  options={educationLists}
                  value={updateUser.education[0]}
                  onSelect={handleEducationSelect}
                  placeholder='Pilih Pendidikan'
                />
                {errors.education && (
                  <p className='p-4 text-xs text-red-500'>{errors.education}</p>
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

              {Array.isArray(updateUser.education) &&
                updateUser.education.map((edu, index) => (
                  <DropdownProfile
                    key={`${edu}-${index}`}
                    options={educationLists}
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
              {errors.education && (
                <p className='px-4 text-xs text-red-500'>{errors.education}</p>
              )}
            </>
          )}
        </div>
        <button
          className='text-md border-1 mt-4 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='submit'
          onClick={handleEditSave}
          disabled={isPending}
        >
          {isPending ? 'Loading...' : 'Simpan'}
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
            <DrawerTitle className='text-xl font-bold text-[#2C2F35] opacity-100'>
              Changes Successful!
            </DrawerTitle>
            <DrawerDescription className='text-sm text-[#2C2F35] opacity-60'>
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
