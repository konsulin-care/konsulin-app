'use client'

import InformationDetail from '@/components/profile/information-detail'
import Schedule from '@/components/profile/schedule'
import Tags from '@/components/profile/tags'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import MedalCollection from '../../components/profile/medal-collection'
import Settings from '../../components/profile/settings'

const settingMenus = [
  { name: 'Pengaturan', link: '/settings' },
  { name: 'Hapus Akun', link: '/remove-account' },
  { name: 'Log out', link: '/logout' }
]

const medalLists = [
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  }
]

const tagsSchedule = ['19 Mei 2024', '20 Mei 2024']

const generalDetails = [
  {
    key: 'Birth(Age)',
    value: '12-12-1993(40)'
  },
  {
    key: 'Sex',
    value: 'Male'
  },
  {
    key: 'Whatsapp',
    value: '08034840384'
  },
  {
    key: 'Email',
    value: 'Aji Danuarta'
  },
  {
    key: 'Education',
    value: 'Bachelor of Lorem Ipsum'
  }
]

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
  return (
    <>
      <Schedule name='Mrs Clinician Name' time='15:00' date='23/12/2030' />
      <InformationDetail
        isRadiusIcon
        iconUrl='/images/sample-foto.svg'
        title='General Information'
        subTitle='Aji Danuarta'
        buttonText='Edit Profile'
        details={generalDetails}
      />
      <InformationDetail
        isRadiusIcon={false}
        iconUrl='/icons/hospital.svg'
        title='Practice Information'
        buttonText='Edit Detail'
        details={praticeDetails}
      />
      <div className='flex flex-col items-center p-4'>
        <div className='flex w-full items-center justify-between'>
          <Image
            src={'/icons/calendar-profile.svg'}
            width={30}
            height={30}
            alt='calendar-icon'
            className='pr-[10px]'
          />
          <p className='text-black-100 flex-grow text-start text-xs font-bold'>
            Edit Availbility Schedule
          </p>
          <ChevronRight color='#13C2C2' width={18} height={18} />
        </div>

        {tagsSchedule.length > 0 && <Tags tags={tagsSchedule} />}
      </div>
      <MedalCollection medals={medalLists} />
      <Settings menus={settingMenus} />
    </>
  )
}
