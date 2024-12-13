'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IUseClinicParams } from '@/services/clinic'
import dayjs from 'dayjs'
import { SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import ClinicFilter from '../clinic/clinic-filter'

export default function Schedule() {
  const [keyword, setKeyword] = useState<string>('')
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({})

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full flex-col'>
          <div className='text-[14px] font-bold text-white'>Book Session</div>
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-[14px] font-bold text-white'>
              Scheduled Session
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
        <div className='w-full p-4'>
          <div className='mb-4 flex gap-4'>
            <InputWithIcon
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder='Search'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              onChange={filter => {
                setClinicFilter(prevState => ({
                  ...prevState,
                  ...filter
                }))
              }}
            />
          </div>

          <Tabs defaultValue='upcoming' className='w-full'>
            <TabsList className='grid w-full grid-cols-2 bg-transparent'>
              <TabsTrigger
                className='rounded-none border-secondary data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:text-secondary data-[state=active]:shadow-none'
                value='upcoming'
              >
                Upcoming Session
              </TabsTrigger>
              <TabsTrigger
                className='rounded-none border-secondary data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:text-secondary data-[state=active]:shadow-none'
                value='past'
              >
                Past Session
              </TabsTrigger>
            </TabsList>
            <TabsContent value='upcoming'>
              <UpcomingSession />
            </TabsContent>
            <TabsContent value='past'>
              <PastSession />
            </TabsContent>
          </Tabs>

          {/* <div className='flex gap-4'>
            {clinicFilter.start_date && clinicFilter.end_date && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {clinicFilter.start_date == clinicFilter.end_date
                  ? format(clinicFilter.start_date, 'dd MMM yy')
                  : format(clinicFilter.start_date, 'dd MMM yy') +
                    ' - ' +
                    format(clinicFilter.end_date, 'dd MMM yy')}
              </Badge>
            )}
            {clinicFilter.start_time && clinicFilter.end_time && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {clinicFilter.start_time + ' - ' + clinicFilter.end_time}
              </Badge>
            )}
            {clinicFilter.location && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {clinicFilter.location}
              </Badge>
            )}
          </div> */}
        </div>
      </div>
    </>
  )
}

function UpcomingSession() {
  return (
    <Link href={'#'} className='card mt-4 flex flex-col gap-2 p-4'>
      <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
        15: 00 - 12/12/2025
      </div>

      <hr className='w-full' />
      <div className='flex items-center'>
        <Image
          className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
          width={32}
          height={32}
          alt='offline'
          src={'/images/avatar.jpg'}
        />

        <div className='mr-auto text-[12px] font-bold'>Fitra Agil</div>
        <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
          Online Session
        </div>
      </div>
    </Link>
  )
}

function PastSession() {
  return (
    <Link href={'#'} className='card mt-4 flex flex-col gap-2 p-4'>
      <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
        15: 00 - 12/12/2025
      </div>

      <hr className='w-full' />
      <div className='flex items-center'>
        <Image
          className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
          width={32}
          height={32}
          alt='offline'
          src={'/images/avatar.jpg'}
        />

        <div className='mr-auto text-[12px] font-bold'>Budi Sudarsono</div>
        <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
          Online Session
        </div>
      </div>
    </Link>
  )
}
