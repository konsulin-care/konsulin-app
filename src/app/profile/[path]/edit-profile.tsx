import Input from '@/components/general/input'
import Dropdown from '@/components/profile/dropdown'
import Image from 'next/image'
import { useRef, useState } from 'react'

const educationOptions: any[] = [
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelor_degree', label: 'Bachelor Degree' },
  { value: 'master_degree', label: 'Master Degree' },
  { value: 'doctoral_degree', label: 'Doctoral Degree' }
]

export default function EditProfile({
  userRole
}: {
  userRole: 'patient' | 'clinician'
}) {
  const [updateUser, setUpdateUser] = useState<any>({
    username: '',
    email: '',
    birthdate: '',
    whatsapp: '',
    sex: '',
    address: '',
    education: ['']
  })

  const [userPhoto, setUserPhoto] = useState<any>('/images/sample-foto.svg')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleButtonClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUserPhoto(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleChangeInput(label: any, value: any) {
    setUpdateUser(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  function handleAddEducationLevel() {
    setUpdateUser(prevState => ({
      ...prevState,
      education: [...prevState.education, '']
    }))
  }

  function handleEducationChange(index: number, value: string) {
    setUpdateUser(prevState => ({
      ...prevState,
      education: prevState.education.map((edu: any, i: number) =>
        i === index ? value : edu
      )
    }))
  }

  function handleEditSave() {
    const updateUserData = {
      photo: userPhoto,
      ...updateUser
    }
    console.log('Saving updated user profile:', updateUserData)
  }

  return (
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
          onChange={event => handleChangeInput('username', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        />
        <Input
          width={24}
          height={24}
          prefixIcon={'/icons/email.svg'}
          placeholder='Masukan Email'
          name='email'
          id='email'
          type='email'
          opacity={false}
          onChange={event => handleChangeInput('email', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        />
        <Input
          width={24}
          height={24}
          prefixIcon={'/icons/calendar-edit.png'}
          placeholder='Masukan Tanggal lahir'
          name='birthdate'
          id='birthdate'
          type='text'
          opacity={false}
          onChange={event => handleChangeInput('birthdate', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        />
        <Input
          width={24}
          height={24}
          prefixIcon={'/icons/region-code.svg'}
          placeholder='Masukan Nomor Whatsapp'
          name='whatsapp'
          id='whatsapp'
          type='text'
          opacity={false}
          onChange={event => handleChangeInput('whatsapp', event.target.value)}
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
          <div className='flex justify-between space-x-2'>
            <Dropdown
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' }
              ]}
              placeholder='Select Sex'
              value={updateUser.sex}
              onChange={value => handleChangeInput('sex', value)}
              className='flex w-1/2 items-center space-x-[10px] rounded-lg'
            />

            {updateUser.education.map((edu: string, index) => (
              <Dropdown
                key={index}
                placeholder='Select Education'
                options={educationOptions}
                value={edu}
                onChange={value => handleEducationChange(index, value)}
                className='flex w-1/2 items-center space-x-[10px] rounded-lg'
              />
            ))}
          </div>
        )}
        {userRole === 'clinician' && (
          <>
            <Dropdown
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' }
              ]}
              placeholder='Select Sex'
              onChange={value => handleChangeInput('sex', value)}
              className='mt-4 flex w-full items-center space-x-[10px] rounded-lg'
            />
            {updateUser.education.map((edu, index) => (
              <Dropdown
                key={index}
                options={[
                  { value: 'diploma', label: 'Diploma' },
                  { value: 'bachelor_degree', label: 'Bachelor Degree' },
                  { value: 'master_degree', label: 'Master Degree' },
                  { value: 'doctoral_degree', label: 'Doctoral Degree' }
                ]}
                value={edu}
                placeholder='Select Education'
                onChange={value => handleEducationChange(index, value)}
                className='mt-4 flex w-full items-center space-x-[10px] rounded-lg'
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
  )
}
