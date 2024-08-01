'use client'

import Collapsible from '@/components/profile/collapsible'
import InformationDetail from '@/components/profile/information-detail'
import MedalCollection from '@/components/profile/medal-collection'
import Settings from '@/components/profile/settings'
import Tags from '@/components/profile/tags'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer'
import { medalLists, settingMenus } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { capitalizeFirstLetter, formatLabel } from '@/utils/validation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

export default function Clinician() {
  const router = useRouter()
  const { state } = useProfile()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openDay, setOpenDay] = useState<string | null>(null)

  const [timeStates, setTimeStates] = useState(
    daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { fromTime: '00:00', toTime: '00:00' }
      }),
      {}
    )
  )

  const handleTimeChange = (
    day: string,
    type: 'from' | 'to',
    value: string
  ) => {
    setTimeStates(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [`${type}Time`]: value
      }
    }))
  }

  const [tagsSchedule, setTagsSchedule] = useState([])

  function handleSave() {
    const timeStatesArray = Object.entries(timeStates).map(([day, times]) => ({
      day,
      from: times['fromTime'],
      to: times['toTime']
    }))
    const formattedTags = timeStatesArray
      .filter(({ from, to }) => from !== '00:00' && to !== '00:00')
      .map(({ day, from, to }) => {
        return `${day} (${from} - ${to})`
      })
    setTagsSchedule(formattedTags)
    setIsDrawerOpen(false)
    console.log(timeStatesArray)
  }

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
      </div>
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
      <div className='mt-4 flex flex-col items-center rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
        <div
          className='flex w-full items-center justify-between'
          onClick={() => setIsDrawerOpen(true)}
        >
          <Image
            src={'/icons/calendar-profile.svg'}
            width={30}
            height={30}
            alt='calendar-icon'
            className='pr-[13px]'
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

      <Drawer onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen}>
        <DrawerContent className='mx-auto mt-6 max-w-screen-sm px-4'>
          <DrawerTitle></DrawerTitle>
          <DrawerDescription></DrawerDescription>
          {daysOfWeek.map(day => (
            <Collapsible
              key={day}
              day={day}
              isOpen={openDay === day}
              onToggle={() => setOpenDay(openDay === day ? null : day)}
            >
              <div className='flex items-center justify-between space-x-4'>
                <div className='flex flex-grow items-center'>
                  <span className='pr-2 text-sm font-medium'>From</span>
                  <input
                    type='time'
                    id='from-time'
                    className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm leading-none text-gray-900 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-green-500 dark:focus:ring-secondary'
                    value={timeStates[day].fromTime}
                    onChange={e =>
                      handleTimeChange(day, 'from', e.target.value)
                    }
                    required
                  />
                </div>
                <div className='flex flex-grow items-center'>
                  <span className='pr-2 text-sm font-medium'>To</span>
                  <input
                    type='time'
                    id='to-time'
                    className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm leading-none text-gray-900 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-green-500 dark:focus:ring-secondary'
                    value={timeStates[day].toTime}
                    onChange={e => handleTimeChange(day, 'to', e.target.value)}
                    required
                  />
                </div>
              </div>
            </Collapsible>
          ))}
          <div className='my-6 w-full items-center justify-center px-2'>
            <Button
              onClick={handleSave}
              variant='secondary'
              className='h-[50px] w-full rounded-lg font-semibold text-white'
            >
              Simpan
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
