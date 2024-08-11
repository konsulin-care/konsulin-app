'use client'

import InformationDetail from '@/components/profile/information-detail'
import MedalCollection from '@/components/profile/medal-collection'
import Settings from '@/components/profile/settings'
import { medalLists, settingMenus } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { capitalizeFirstLetter, formatLabel } from '@/utils/validation'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Patient() {
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
      <div className='mb-4 flex justify-between rounded-lg bg-secondary p-4'>
        <Image
          width={48}
          height={48}
          src={'/icons/diamond.svg'}
          alt='membership-premium-logo'
        />
        <div className='flex w-full flex-col items-start justify-start pl-2'>
          <div className='flex flex-grow items-start pb-[2px]'>
            <p className='mb-1 text-left text-sm font-bold text-white'>
              Membership Premium
            </p>
            <div className='ml-4 flex h-6 w-[100px] flex-grow items-center justify-center space-x-1 rounded-full bg-white py-2'>
              <Image
                width={12}
                height={9}
                src={'/icons/diamond-small.svg'}
                alt='membership-premium-logo'
              />
              <p className='text-black-100 whitespace-nowrap pl-1 text-[10px] font-semibold'>
                150 Points
              </p>
            </div>
          </div>
          <div className='w-full'>
            <p className='text-left text-[10px] text-white opacity-75'>
              Tergabung Sejak 2019
            </p>
          </div>
        </div>
        <div className='flex items-start justify-center'>
          <ChevronRightIcon color='white' width={24} height={24} />
        </div>
      </div>
      <InformationDetail
        isRadiusIcon
        iconUrl='/images/sample-foto.svg'
        title={state.profile.fullname}
        subTitle={state.profile.email}
        buttonText='Edit Profile'
        details={profileDetail}
        onEdit={() => router.push('profile/edit-profile')}
        role='patient'
      />
      <MedalCollection medals={medalLists} />
      <Settings menus={settingMenus} />
    </>
  )
}
