'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'

const Session: React.FC<IWithAuth> = ({ userRole }) => {
  return (
    <NavigationBar>
      <Header>
        <div className='flex w-full flex-col'>
          <div className='flex items-center'>
            <Image
              className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
              width={32}
              height={32}
              alt='offline'
              src={'/images/avatar.jpg'}
            />
            <div className='text-[14px] font-bold text-white'>Book Session</div>
          </div>
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-[14px] font-bold text-white'>
              Schedule Active
            </div>
            <Link href='/' className='text-[10px] text-white'>
              See All
            </Link>
          </div>
          <div className='card mt-4 flex items-center bg-[#F9F9F9]'>
            <Image
              className='mr-[10px] min-h-[32] min-w-[32]'
              src={'/icons/calendar.svg'}
              width={32}
              height={32}
              alt='calendar'
            />
            <div className='mr-auto flex flex-col'>
              <span className='text-[12px] text-muted'>
                Upcoming Session With
              </span>
              <span className='text-[14px] font-bold text-secondary'>
                Mrs Clinician Name
              </span>
            </div>
            <div className='s'>
              <span className='text-[12px] font-bold'>
                {dayjs().format('HH:mm')} |{' '}
              </span>
              <span className='text-[12px]'>
                {dayjs().format('DD/MM/YYYY')}
              </span>
            </div>
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='p-4'>
          {/* <div>filter</div> */}
          <div className='flex'>
            {/* <InputWithIcon
              className='w-full mr-4 h-[50px] border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            /> */}
            {/* <div className='h-[50px] w-[50px] rounded-lg bg-[#F9F9F9]'>x</div> */}
          </div>
          <div className='mt-4 grid grid-cols-2 gap-4'>
            {Array(12)
              .fill(undefined)
              .map((_, index: number) => (
                <div key={index} className='card flex flex-col items-center'>
                  <Image
                    className='h-[100px] w-full rounded-lg object-cover'
                    src='/images/avatar.jpg'
                    alt='clinic'
                    width={158}
                    height={100}
                  />
                  <div className='mt-2 font-bold text-primary'>
                    Klinik Jaga Mental
                  </div>
                  <div className='mt-2 flex flex-wrap justify-center gap-1'>
                    <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
                      Workplace
                    </Badge>
                    <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
                      Relationship
                    </Badge>
                    <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
                      Social Interaction
                    </Badge>
                  </div>
                  <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'>
                    Check
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </NavigationBar>
  )
}
export default withAuth(Session, ['patient', 'clinician'], true)
