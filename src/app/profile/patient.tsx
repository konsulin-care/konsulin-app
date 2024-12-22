'use client'

import InformationDetail from '@/components/profile/information-detail'
import MedalCollection from '@/components/profile/medal-collection'
import Settings from '@/components/profile/settings'
import { medalLists, settingMenus } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { fetchProfile, ResponseProfile } from '@/services/profile'
import { useQuery } from '@tanstack/react-query'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Patient() {
  const router = useRouter()
  const { state, dispatch } = useProfile()

  // fetch profile
  const { data: profileResponse } = useQuery<ResponseProfile>({
    queryKey: ['profile-patient'],
    queryFn: () => fetchProfile(state, dispatch)
  })

  const profileDetail = [
    { key: 'Birth(Age)', value: state.profile.birth_date },
    { key: 'Sex', value: state.profile.gender },
    { key: 'Whatsapp', value: state.profile.whatsapp_number },
    { key: 'Email', value: state.profile.email },
    { key: 'Address', value: state.profile.address },
    { key: 'Educations', value: state.profile.educations }
  ]

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
      <MedalCollection medals={medalLists} isDisabled={true} />
      <Settings menus={settingMenus} />
    </>
  )
}
