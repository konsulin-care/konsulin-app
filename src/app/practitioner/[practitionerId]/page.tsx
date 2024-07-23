'use client'

import Header from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import withAuth from '@/hooks/withAuth'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  HospitalIcon
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PractitionerAvailbility from '../practitioner-availbility'

export interface IPractitionerProps {
  IWithAuth
  params: { practitionerId: string }
}

const Practitioner: React.FC<IPractitionerProps> = ({ params }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />
          <div className='text-[14px] font-bold text-white'>
            Detail Practitioner
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        <div className='flex flex-col items-center'>
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

          <h3 className='mt-2 text-center text-[20px] font-bold'>
            Klinik Jaga Mental Andini Putri, M. Psi
          </h3>
        </div>

        <PractitionerAvailbility isOpen={isOpen} toggleOpen={e => setIsOpen(e)}>
          <div
            onClick={() => setIsOpen(true)}
            className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'
          >
            <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
            <span className='mr-auto text-[12px] font-bold'>
              See Availbility
            </span>
            <ArrowRightIcon color='#13C2C2' />
          </div>
        </PractitionerAvailbility>

        <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
          <div className='flex items-center'>
            <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
            <span className='text-[12px] font-bold'>Practice Information</span>
          </div>
          <div className='mt-4 flex flex-col space-y-2'>
            <div className='flex justify-between text-[12px]'>
              <span className='mr-2'>Affiliation</span>
              <span className='font-bold'>Konsulin</span>
            </div>
            <div className='flex justify-between text-[12px]'>
              <span className='mr-2'>Experience</span>
              <span className='font-bold'>2 Year</span>
            </div>
            <div className='flex justify-between text-[12px]'>
              <span className='mr-2'>Fee</span>
              <span className='font-bold'>250.000/Session</span>
            </div>
          </div>
        </div>

        <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9]'>
          <div className='flex items-center'>
            <HospitalIcon size={32} color='#13C2C2' className='mr-2' />
            <span className='text-[12px] font-bold'>Specialty</span>
          </div>

          <div className='mt-4 flex flex-wrap gap-1'>
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
        </div>
        <Link
          href={`/practitioner/${params.practitionerId}/book-practitioner`}
          className='mt-auto w-full'
        >
          <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
            Book Session
          </Button>
        </Link>
      </div>
    </>
  )
}
export default withAuth(Practitioner, ['patient'], true)
