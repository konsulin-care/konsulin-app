import Input from '@/components/general/input'
import DobCalendar from '@/components/profile/dob-calendar'
import DropdownProfile from '@/components/profile/dropdown-profile'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { format } from 'date-fns'
import Image from 'next/image'
import { useRef, useState } from 'react'

const educationOptions = [
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelor_degree', label: 'Bachelor Degree' },
  { value: 'master_degree', label: 'Master Degree' },
  { value: 'doctoral_degree', label: 'Doctoral Degree' }
]

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
]

export default function EditProfile({ userRole }) {
  const [updateUser, setUpdateUser] = useState({
    username: '',
    email: '',
    birthdate: undefined,
    whatsapp: '',
    sex: '',
    address: '',
    education: []
  })

  const [userPhoto, setUserPhoto] = useState('/images/sample-foto.svg')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dobDrawerOpen, setDobDrawerOpen] = useState(false)

  const [genderValue, setGenderValue] = useState('')
  const [educationValue, setEducationValue] = useState<string[]>([])

  const handleGenderSelect = (value: string) => {
    setGenderValue(value)
    handleChangeInput('sex', value)
  }

  const handleEducationSelect = (value: string) => {
    const selectedOption = educationOptions.find(
      option => option.value === value
    )
    if (selectedOption) {
      setEducationValue(prevEducation => [
        ...prevEducation,
        selectedOption.value
      ])
      handleChangeInput('education', [
        ...updateUser.education,
        selectedOption.value
      ])
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUserPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleChangeInput = (label: string, value: any) => {
    setUpdateUser(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  const handleAddEducationLevel = () => {
    setUpdateUser(prevState => ({
      ...prevState,
      education: [...prevState.education, '']
    }))
  }

  const handleEducationChange = (index: number, value: string) => {
    setUpdateUser(prevState => ({
      ...prevState,
      education: prevState.education.map((edu, i) =>
        i === index ? value : edu
      )
    }))
  }

  const handleEditSave = () => {
    updateUser.birthdate = format(updateUser.birthdate, 'yyyy-MM-dd')
    const updateUserData = {
      photo: userPhoto,
      ...updateUser
    }
    console.log('Saving updated user profile:', updateUserData)
  }

  const handleDOBChange = (value: any) => {
    setUpdateUser(prevState => ({
      ...prevState,
      birthdate: value
    }))
    setDobDrawerOpen(false)
  }

  const closeDrawer = () => {
    setDobDrawerOpen(false)
  }

  return (
    <>
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <div className='flex flex-col items-center justify-center p-4'>
          <div className='pb-2'>
            <Image
              className='rounded-full'
              src={userPhoto}
              width={64}
              height={64}
              alt='user-photo'
            />
          </div>
          <div className='flex items-center justify-center space-x-2 px-4 py-2'>
            <Image
              src={'/icons/edit-photo.svg'}
              width={16}
              height={16}
              alt='edit-photo'
            />
            <span
              className='cursor-pointer text-xs font-normal text-secondary'
              onClick={handleButtonClick}
            >
              Ganti Photo
            </span>
          </div>
          <input
            type='file'
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept='image/*'
          />
        </div>
        <div className='flex flex-col space-y-4 py-4'>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/user-edit.png'}
            placeholder='Masukan Nama Akun'
            name='username'
            id='username'
            type='text'
            opacity={false}
            onChange={event =>
              handleChangeInput('username', event.target.value)
            }
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          <div
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onClick={() => setDobDrawerOpen(true)}
          >
            <Image
              src={'/icons/calendar-edit.png'}
              alt='calendar-icon'
              width={24}
              height={24}
            />
            <div className='flex flex-grow justify-start text-sm'>
              {updateUser.birthdate
                ? format(updateUser.birthdate, 'yyyy-MM-dd')
                : 'Masukan Tanggal Lahir'}
            </div>
          </div>
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/region-code.svg'}
            placeholder='Masukan Nomor Whatsapp'
            name='whatsapp'
            id='whatsapp'
            type='text'
            opacity={false}
            onChange={event =>
              handleChangeInput('whatsapp', event.target.value)
            }
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          <Input
            width={24}
            height={24}
            prefixIcon={'/icons/location.svg'}
            placeholder='Masukan Alamat Tinggal'
            name='address'
            id='address'
            type='text'
            opacity={false}
            onChange={event => handleChangeInput('address', event.target.value)}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          />
          {userRole === 'patient' && (
            <div className='flex w-full flex-grow justify-between space-x-2'>
              <DropdownProfile
                options={genderOptions}
                value={genderValue}
                onSelect={handleGenderSelect}
                placeholder='Pilih Gender'
              />

              <DropdownProfile
                options={educationOptions}
                value={educationValue[0] || ''}
                onSelect={handleEducationSelect}
                placeholder='Pilih Pendidikan'
              />
            </div>
          )}
          {userRole === 'clinician' && (
            <>
              <DropdownProfile
                options={genderOptions}
                value={genderValue}
                onSelect={handleGenderSelect}
                placeholder='Pilih Gender'
              />
              {updateUser.education.map((edu, index) => (
                <DropdownProfile
                  key={`${edu}-${index}`}
                  options={educationOptions}
                  value={edu}
                  onSelect={value => handleEducationChange(index, value)}
                  placeholder='Pilih Pendidikan'
                />
              ))}
              <p
                className='text-center text-sm font-normal'
                onClick={handleAddEducationLevel}
              >
                + Add Education Level
              </p>
            </>
          )}
          <div className='py-4'></div>
          <button
            className='text-md border-1 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
            type='submit'
            onClick={handleEditSave}
          >
            Simpan
          </button>
        </div>
      </div>
      <Drawer open={dobDrawerOpen} onClose={closeDrawer}>
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='p-4'>
          <DrawerHeader>
            <DrawerTitle></DrawerTitle>
            <DrawerDescription></DrawerDescription>
          </DrawerHeader>
          <DobCalendar
            value={updateUser.birthdate}
            onChange={handleDOBChange}
          />
        </DrawerContent>
      </Drawer>
    </>
  )
}
