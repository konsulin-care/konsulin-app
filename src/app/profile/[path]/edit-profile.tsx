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
import { StateProfile } from '@/context/profile/profileTypes'
import { apiRequest } from '@/services/api'
import { validateEmail } from '@/utils/validation'
import { useMutation } from '@tanstack/react-query'
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
  education: string | string[]
}

export default function EditProfile({ userRole }) {
  const { state, dispatch } = useProfile()
  const [userData, setUserData] = useState<UpdateUser>({
    fullname: '',
    email: '',
    birth_date: undefined,
    whatsapp_number: '',
    gender: '',
    address: '',
    education: '' || []
  })
  const [userPhoto, setUserPhoto] = useState('/images/sample-foto.svg')
  const [drawerState, setDrawerState] = useState(DRAWER_STATE.NONE)

  const [genderValue, setGenderValue] = useState('')
  const [educationPatientValue, setEducationPatientValue] = useState<string>('')
  const [educationClinicianValue, setEducationClinicianValue] = useState<
    string[]
  >([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

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
      dispatch({ type: 'updated', payload: updateUser })
      setDrawerState(DRAWER_STATE.SUCCESS)
    }
  })

  useEffect(() => {
    setUserData(prevUserState => ({
      ...prevUserState,
      ...state
    }))

    if (state.gender) {
      setGenderValue(state.gender)
    }

    if (userRole === 'patient' && typeof state.education === 'string') {
      console.log(state.education, 'patient ===')
      setEducationPatientValue(state.education)
    } else if (userRole === 'clinician' && Array.isArray(state.education)) {
      console.log(state.education)
      setEducationClinicianValue(state.education)
    }
  }, [state, userRole])

  function handleGenderSelect(value: string) {
    setGenderValue(value)
    dispatch({ type: 'updated', payload: { ...state, gender: value } })
  }

  function handleEducationSelect(value: string) {
    const selectedOption = educationLists.find(option => option.value === value)
    if (selectedOption) {
      if (userRole === 'clinician') {
        setEducationClinicianValue(prevEducation => [
          ...prevEducation,
          selectedOption.value
        ])
        dispatch({
          type: 'updated',
          payload: {
            ...state,
            education: [...(state.education as string[]), selectedOption.value]
          }
        })
      } else if (userRole === 'patient') {
        setEducationPatientValue(selectedOption.value)
        dispatch({
          type: 'updated',
          payload: {
            ...state,
            education: selectedOption.value
          }
        })
      }
    }
  }

  function handleChangeInput(label: string, value: any) {
    dispatch({ type: 'updated', payload: { ...state, [label]: value } })
  }

  function handleAddEducationLevel() {
    const newEducation = Array.isArray(state.education)
      ? [...state.education, '']
      : ['']
    dispatch({
      type: 'updated',
      payload: {
        ...state,
        education: newEducation
      }
    })
  }

  function handleEducationChange(index: number, value: string) {
    if (Array.isArray(state.education)) {
      dispatch({
        type: 'updated',
        payload: {
          ...state,
          education: state.education.map((edu, i) =>
            i === index ? value : edu
          )
        }
      })
    }
  }

  function handleEditSave() {
    const validationErrors = validateForm(state)

    if (Object.keys(validationErrors).length === 0) {
      const updatedProfile = {
        ...state,
        birth_date: state.birth_date
          ? format(state.birth_date, 'yyyy-MM-dd')
          : undefined
      }
      mutate(updatedProfile)
    } else {
      setErrors(validationErrors)
    }
  }

  function handleDOBChange(value: any) {
    dispatch({ type: 'updated', payload: { ...state, birth_date: value } })
    setDrawerState(DRAWER_STATE.NONE)
  }

  function closeDrawer() {
    setDrawerState(DRAWER_STATE.NONE)
  }

  function validateForm(user: StateProfile) {
    const errors: { [key: string]: string } = {}
    if (!user.fullname) {
      errors.fullname = 'Username is required'
    }

    if (!user.email) {
      errors.email = 'Email is required'
    } else if (!validateEmail(user.email)) {
      errors.email = 'Valid email is required'
    }

    if (!user.whatsapp_number) {
      errors.whatsapp_number = 'Whatsapp number is required'
    }

    if (!user.address) {
      errors.address = 'Address is required'
    }

    if (!user.birth_date) {
      errors.birth_date = 'Birthdate is required'
    }

    if (!user.gender) {
      errors.gender = 'Gender is required'
    }

    if (typeof user.education === 'string' && user.education.trim() === '') {
      errors.education = 'Education is required'
    } else if (Array.isArray(user.education) && user.education.length === 0) {
      errors.education = 'At least one education level is required'
    }

    return errors
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
            value={userData.fullname}
            onChange={event =>
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
            value={userData.email}
            onChange={event => handleChangeInput('email', event.target.value)}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.email && (
            <p className='px-4 text-xs text-red-500'>{errors.email}</p>
          )}
          <div
            className='flex w-full cursor-pointer items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onClick={() => setDrawerState(DRAWER_STATE.DOB)}
          >
            <Image
              src={'/icons/calendar-edit.png'}
              alt='calendar-icon'
              width={24}
              height={24}
            />
            <div className='flex flex-grow justify-start text-sm'>
              {state.birth_date
                ? format(state.birth_date, 'yyyy-MM-dd')
                : 'Masukan Tanggal Lahir'}
            </div>
          </div>
          {errors.birth_date && (
            <p className='px-4 text-xs text-red-500'>{errors.birth_date}</p>
          )}
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/country-code.svg'}
            placeholder='Masukan Nomor Whatsapp'
            name='whatsapp_number'
            id='whatsapp_number'
            type='text'
            value={userData.whatsapp_number}
            opacity={false}
            onChange={event =>
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
            placeholder='Masukan Alamat Tinggal'
            name='address'
            id='address'
            type='text'
            opacity={false}
            value={userData.address}
            onChange={event => handleChangeInput('address', event.target.value)}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {errors.address && (
            <p className='px-4 text-xs text-red-500'>{errors.address}</p>
          )}
          {userRole === 'patient' && (
            <div className='flex w-full flex-grow justify-between space-x-2'>
              <div className='flex-1 flex-col'>
                <DropdownProfile
                  options={genderOptions}
                  value={genderValue}
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
                  value={educationPatientValue}
                  onSelect={handleEducationSelect}
                  placeholder='Pilih Pendidikan'
                />
                {errors.education && (
                  <p className='p-4 text-xs text-red-500'>{errors.education}</p>
                )}
              </div>
            </div>
          )}
          {userRole === 'clinician' && (
            <>
              <div className='flex flex-col'>
                <DropdownProfile
                  options={genderOptions}
                  value={genderValue}
                  onSelect={handleGenderSelect}
                  placeholder='Pilih Gender'
                />
                {errors.gender && (
                  <p className='px-4 text-xs text-red-500'>{errors.gender}</p>
                )}
              </div>

              {Array.isArray(state.education) &&
                state.education.map((edu, index) => (
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
          <DobCalendar value={state.birth_date} onChange={handleDOBChange} />
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
