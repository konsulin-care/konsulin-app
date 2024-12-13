'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Badge } from '@/components/ui/badge'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { format } from 'date-fns'
import { ChevronLeftIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ClinicFilter from './record-filter'

export default function Record() {
  const router = useRouter()
  const [recordFilter, setRecordFilter] = useState<any>({
    name: ''
  })

  function handleSetRecordFilter(key: string, value: string) {
    setRecordFilter(prevState => ({
      ...prevState,
      [key]: value
    }))
  }
  return (
    <>
      <NavigationBar />
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>Summary Record</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        {/* Filter & Search */}
        <div className='flex flex-col p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={recordFilter.name}
              onChange={event =>
                handleSetRecordFilter('name', event.target.value)
              }
              placeholder='Search Entry & Record'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              onChange={filter => {
                setRecordFilter(prevState => ({
                  ...prevState,
                  ...filter
                }))
              }}
            />
          </div>

          <div className='flex gap-4'>
            {recordFilter.start_date && recordFilter.end_date && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {recordFilter.start_date == recordFilter.end_date
                  ? format(recordFilter.start_date, 'dd MMM yy')
                  : format(recordFilter.start_date, 'dd MMM yy') +
                    ' - ' +
                    format(recordFilter.end_date, 'dd MMM yy')}
              </Badge>
            )}
            {recordFilter.type && recordFilter.type !== 'All' && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {recordFilter.type}
              </Badge>
            )}
          </div>
        </div>

        <div className='bg-[#F9F9F9] p-4'>
          <Link
            href={'/journal'}
            className='card flex w-full bg-white px-4 py-6'
          >
            <Image
              src={'/images/writing.svg'}
              width={40}
              height={40}
              alt='writing'
            />
            <div className='ml-2 flex flex-col'>
              <span className='text-[12px] font-bold text-primary'>
                Start Writting
              </span>
              <span className='text-[10px] text-primary'>
                Express your current feelings
              </span>
            </div>
          </Link>
        </div>

        <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Previous Record Summary
          </div>
          <Link
            href={`record/${123}`}
            className='card mt-4 flex flex-col gap-2 p-4'
          >
            <div className='flex'>
              <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                <Image
                  className='h-[24px] w-[24px] object-cover'
                  src={'/images/note.svg'}
                  width={24}
                  height={24}
                  alt='note'
                />
              </div>
              <div className='flex flex-col'>
                <div className='text-[12px] font-bold'>
                  Tingkatkan Rasa Tenangmu
                </div>
                <div className='text-[10px]'>
                  Hasil pemeriksaan menunjukkan kondisi kesejahteraan mental
                  Anda dan memberikan arahan untuk perawatan lebih lanjut
                </div>
              </div>
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

              <div className='mr-auto text-[12px]'>Dr.Fitra Gunawan</div>
              <div className='text-[10px]'>12/12/2025</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
