'use client'

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const settingMenus = [
  { name: 'Pengaturan', link: '/settings' },
  { name: 'Hapus Akun', link: '/' },
  { name: 'Log out', link: '/logout' }
]

export default function Patient() {
  const router = useRouter()

  function handleClick(path: string) {
    if (path === '/logout') {
      localStorage.clear()
      router.push('/login')
    }
    router.push(path)
  }

  return (
    <>
      {/* Card Membership Premium */}
      <div className='flex justify-between rounded-lg bg-secondary p-4'>
        <div>
          <Image
            width={48}
            height={48}
            src={'/icons/diamond.svg'}
            alt='membership-premium-logo'
          />
        </div>
        <div className='flex flex-grow flex-col items-start justify-start pl-2'>
          <div className='flex w-full items-start pb-[2px]'>
            <p className='flex-grow text-left text-sm font-bold text-white'>
              Membership Premium
            </p>
            <div className='flex h-6 w-[100px] items-center justify-center space-x-1 rounded-full bg-white py-2'>
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
        <div className='flex items-start justify-center pl-6'>
          <ChevronRightIcon color='white' width={24} height={24} />
        </div>
      </div>
      {/* Profile Detail */}
      <div className='flex w-full flex-col items-center justify-center p-4'>
        {/* Header */}
        <div className='flex w-full justify-between pb-2 pt-4'>
          <div className='flex w-1/2'>
            <Image
              src={'/images/sample-foto.svg'}
              width={32}
              height={32}
              className='rounded-full'
              alt='sample-foto'
            />
            <div className='flex flex-col items-start justify-start'>
              <p className='px-2 text-sm font-bold text-[#2C2F35]'>
                Aji Danuarta
              </p>
              <p className='px-2 text-[10px] text-[#2C2F35]'>
                aji.dannuarta@gmail.com
              </p>
            </div>
          </div>
          <div className='flex w-1/2 items-center justify-end'>
            <button>
              <div className='w-[100px] rounded-full bg-secondary p-[7px]'>
                <p className='text-[10px] text-white'>Edit Profile</p>
              </div>
            </button>
          </div>
        </div>
        <div className='flex w-full border-t border-[#E3E3E3]' />
        <div className='flex w-full flex-col space-y-2 py-2'>
          <div className='flex justify-between font-[#2C2F35] text-xs'>
            <p>Age</p>
            <p className='font-bold'>40 Year</p>
          </div>
          <div className='flex justify-between font-[#2C2F35] text-xs'>
            <p>Sex</p>
            <p className='font-bold'>Male</p>
          </div>
          <div className='flex justify-between font-[#2C2F35] text-xs'>
            <p>Education</p>
            <p className='font-bold'>Diploma</p>
          </div>
          <div className='flex justify-between font-[#2C2F35] text-xs'>
            <p>Whatsapp</p>
            <p className='font-bold'>08034840384</p>
          </div>
        </div>
      </div>

      {/* Medal Collection */}
      <div>
        <div className='flex justify-between pb-4'>
          <p className='text-sm font-bold text-[#2C2F35] opacity-60'>
            Medal Collection
          </p>
          <p className='text-sm text-[#2C2F35] opacity-60'>See All</p>
        </div>
        <ScrollArea className='w-full whitespace-nowrap rounded-md border'>
          <div className='flex'>
            {Array(5)
              .fill(undefined)
              .map((_, index: number) => (
                <Link
                  key={index}
                  href={'/'}
                  className='card flex w-[250px] items-center text-wrap bg-white text-justify'
                >
                  <Image
                    src={'/icons/survivor.svg'}
                    alt='survivor-icon'
                    width={48}
                    height={48}
                  />
                  <div className='flex flex-col items-start justify-start pl-2'>
                    <p className='py-1 text-xs font-bold text-secondary'>
                      Survivor
                    </p>
                    <p className='text-black-100 text-start text-[10px]'>
                      completing mindfulness exercises and boosting your mental
                      wellness journey.
                    </p>
                  </div>
                </Link>
              ))}
          </div>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </div>
      {/* Schedule Active */}
      <div className='pt-4'>
        <div className='flex justify-between'>
          <p className='text-sm font-bold text-[#2C2F35] opacity-60'>
            Schedule Active
          </p>
          <p className='text-sm text-[#2C2F35] opacity-60'>See All</p>
        </div>
        <div className='flex items-center justify-between'>
          <div className='p-4'>
            <Image
              src={'icons/calendar.svg'}
              alt='calendar-icons'
              width={26}
              height={25}
            />
          </div>
          <div className='flex flex-grow flex-col items-start'>
            <p className='text-xs text-[#2C2F35] opacity-60'>
              Upcoming Session With
            </p>
            <p className='text-sm font-bold text-[#10958D]'>
              Mrs Clinician Name
            </p>
          </div>
          <div className='p-4 text-xs'>
            <span className='font-bold'>15:00</span> | 23/12/2030
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className='w-full rounded-lg bg-white'>
        <ul>
          {settingMenus.map((item, index) => {
            const isFirst = index === 0
            const isLast = index === settingMenus.length - 1
            return (
              <div key={item.name} onClick={() => handleClick(item.link)}>
                <li
                  className={`flex items-center justify-between py-4 ${
                    !isFirst && !isLast ? 'border-b border-[#E8E8E8]' : ''
                  } ${isFirst || isLast ? 'border-none' : 'border-t border-[#E8E8E8]'}`}
                >
                  <Image
                    src={'/icons/settings.svg'}
                    alt='setting-icons'
                    width={24}
                    height={24}
                  />
                  <p className='flex flex-grow justify-start pl-4 font-[#26282C] text-xs font-normal'>
                    {item.name}
                  </p>
                  <ChevronRightIcon color='#ADB6C7' width={18} height={18} />
                </li>
              </div>
            )
          })}
        </ul>
      </div>
    </>
  )
}
