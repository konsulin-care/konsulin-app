'use client'

import InformationDetail from '@/components/profile/information-detail'
import MedalCollection from '@/components/profile/medal-collection'
import Schedule from '@/components/profile/schedule'
import Settings from '@/components/profile/settings'
import Tags from '@/components/profile/tags'
import { medalLists, settingMenus } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { capitalizeFirstLetter, formatLabel } from '@/utils/validation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const tagsSchedule = ['19 Mei 2024', '20 Mei 2024']

const praticeDetails = [
  {
    key: 'Affiliation',
    value: 'Konsulin'
  },
  {
    key: 'Experience',
    value: '2 Year'
  },
  {
    key: 'Fee',
    value: '250.000/Session'
  },
  {
    key: 'Specialty',
    value: [
      'Anxiety',
      'Depression',
      'Personality',
      'Self Improvement',
      'Workplace',
      'Social Interaction',
      'Relationship'
    ]
  }
]

export default function Clinician() {
  const router = useRouter()
  const { state } = useProfile()

  /* Manipulation objects from response {} to array */
  const profileDetail = Object.entries(state.profile)
    .map(([key, value]) => {
      const renderValue = (value: any) => {
        if (value === null || value === undefined || value === '') {
          return null
        }
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      }

      let formattedValue = renderValue(value)

      if (key === 'gender' && formattedValue !== null) {
        formattedValue = capitalizeFirstLetter(
          formattedValue.replace(/[_-]/g, ' ')
        )
      }

      return formattedValue !== null
        ? { key: formatLabel(key), value: formattedValue }
        : null
    })
    .filter(item => item !== null)

  return (
    <>
      <div className='mb-4'>
        <Schedule name='Mrs Clinician Name' time='15:00' date='23/12/2030' />
      </div>
      <InformationDetail
        isRadiusIcon
        iconUrl='/images/sample-foto.svg'
        title='General Information'
        subTitle={state.profile.fullname}
        buttonText='Edit Profile'
        details={profileDetail}
        onEdit={() => router.push('profile/edit-profile')}
        role='clinician'
      />
      <div className='my-4' />
      <InformationDetail
        isRadiusIcon={false}
        iconUrl='/icons/hospital.svg'
        title='Practice Information'
        buttonText='Edit Detail'
        details={praticeDetails}
        onEdit={() => router.push('profile/edit-pratice')}
        role='clinician'
      />
      <div className='mt-4 flex flex-col items-center bg-[#F9F9F9] px-4 py-[20px]'>
        <div className='flex w-full items-center justify-between'>
          <Image
            src={'/icons/calendar-profile.svg'}
            width={30}
            height={30}
            alt='calendar-icon'
            className='pr-[10px]'
          />
          <p className='flex-grow text-start text-xs font-bold text-[#2C2F35] opacity-100'>
            Edit Availbility Schedule
          </p>
          <ChevronRight color='#13C2C2' width={24} height={24} />
        </div>

        {tagsSchedule.length > 0 && <Tags tags={tagsSchedule} />}
      </div>
      <MedalCollection medals={medalLists} />
      <Settings menus={settingMenus} />
    </>
  )
}
