'use client'

import ClinicFilter from '@/app/clinic/clinic-filter'
import CardLoader from '@/components/general/card-loader'
import EmptyState from '@/components/general/empty-state'
import Header from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import withAuth from '@/hooks/withAuth'
import {
  IUseClinicParams,
  useClinicFindAll,
  useClinicFindByID
} from '@/services/clinic'
import { format } from 'date-fns'
import { ChevronLeftIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export interface IDetailClinic {
  IWithAuth
  params: { clinicId: string }
}

const DetailClinic: React.FC<IDetailClinic> = ({ params }) => {
  const [keyword, setKeyword] = useState<string>('')

  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({})

  const {
    data: clinicians,
    isLoading: isCliniciansLoading,
    isFetching: isCliniciansFetching
  } = useClinicFindAll({
    keyword,
    filter: clinicFilter,
    clinicId: params.clinicId
  })

  const { data: detaillClinic, isLoading: isDetaillClinicLoading } =
    useClinicFindByID(params.clinicId)

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <Link href='/clinic'>
            <ChevronLeftIcon color='white' className='mr-2 cursor-pointer' />
          </Link>
          <div className='text-[14px] font-bold text-white'>Detail Clinic</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <Image
          className='h-[124px] w-full rounded-lg object-cover'
          src='/images/clinic.jpg'
          width={396}
          height={124}
          alt='detail-clinic'
        />

        <h3 className='mt-2 text-center text-[20px] font-bold'>
          {detaillClinic?.data?.clinic_name}
        </h3>

        <div className='card mt-2 border-0 bg-[#F9F9F9] p-4 text-[12px]'>
          <div className='mb-4 font-bold'>Clinic Information</div>
          <div className='flex justify-between'>
            <span>Affiliation</span>
            <span className='font-bold'>Konsulin</span>
          </div>
          <div className='mt-2 flex flex-col'>
            <span>Alamat</span>
            <span className='font-bold'>{detaillClinic?.data?.address}</span>
          </div>
        </div>

        <div className='mt-4 flex gap-4'>
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

        <div className='flex gap-4'>
          {clinicFilter.start_date && clinicFilter.end_date && (
            <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
              {format(clinicFilter.start_date, 'dd MMM yy') +
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
        </div>

        {isCliniciansLoading || isCliniciansFetching ? (
          <CardLoader />
        ) : Array.isArray(clinicians.data) && clinicians.data.length ? (
          <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
            {clinicians.data.map(clinician => (
              <div
                key={clinician.practitioner_id}
                className='card flex flex-col items-center'
              >
                <div className='relative flex justify-center'>
                  <Image
                    className='h-[100px] w-[100px] rounded-full object-cover'
                    src='/images/avatar.jpg'
                    alt='clinic'
                    width={100}
                    height={100}
                  />

                  <Badge className='absolute bottom-0 flex h-[24px] min-w-[100px] justify-center bg-[#08979C] font-normal text-white'>
                    Konsulin
                  </Badge>
                </div>
                <div className='mt-2 text-center font-bold text-primary'>
                  {clinician.name}
                </div>
                <div className='mt-2 flex flex-wrap justify-center gap-1'>
                  {clinician.specialties.length &&
                    clinician.specialties.map((specialty, index) => (
                      <Badge
                        key={index}
                        className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                      >
                        {specialty}
                      </Badge>
                    ))}
                </div>
                <Link
                  href={{
                    pathname: `/practitioner/${clinician.practitioner_id}`,
                    query: { clinicId: params.clinicId }
                  }}
                  className='mt-auto w-full'
                >
                  <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'>
                    Check
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title='No Clinicians Found'
            subtitle='Try Another Clinic.'
          />
        )}
      </div>
    </>
  )
}
export default withAuth(DetailClinic, ['patient'], true)
