'use client'

import CardLoader from '@/components/general/card-loader'
import EmptyState from '@/components/general/empty-state'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { IUseClinicParams, useClinicFindAll } from '@/services/clinic'
import dayjs from 'dayjs'
import { SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import ClinicFilter from './clinic-filter'

const Clinic: React.FC<IWithAuth> = () => {
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({
    name: ''
  })
  function handleSetClinicFilter(key: string, value: string) {
    setClinicFilter(prevState => ({
      ...prevState,
      [key]: value
    }))
  }

  const {
    data: clinics,
    isLoading: isClinicsLoading,
    error
  } = useClinicFindAll(clinicFilter)

  useEffect(() => {
    console.log(clinics)
  }, [clinics])

  return (
    <NavigationBar>
      <Header>
        <div className='flex w-full flex-col'>
          <div className='text-[14px] font-bold text-white'>Book Session</div>
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
        <div className='w-full p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={clinicFilter.name}
              onChange={event =>
                handleSetClinicFilter('name', event.target.value)
              }
              placeholder='Search'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter />
          </div>
          {isClinicsLoading ? (
            <CardLoader />
          ) : (
            Array.isArray(clinics?.data) &&
            (!clinics.data.length ? (
              <EmptyState />
            ) : (
              <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
                {clinics.data.map(clinic => (
                  <div
                    key={clinic.clinic_id}
                    className='card flex flex-col items-center'
                  >
                    <Image
                      className='h-[100px] w-full rounded-lg object-cover'
                      src='/images/clinic.jpg'
                      alt='clinic'
                      width={158}
                      height={100}
                    />
                    <div className='mt-2 text-center font-bold text-primary'>
                      {clinic.clinic_name}
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
                    <Link
                      href={`/clinic/${clinic.clinic_id}`}
                      className='w-full'
                    >
                      <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'>
                        Check
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </NavigationBar>
  )
}
export default withAuth(Clinic, ['patient'], true)
