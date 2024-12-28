'use client'

import Header from '@/components/header'
import { LoadingSpinnerIcon } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBooking } from '@/context/booking/bookingContext'
import { IStateBooking } from '@/context/booking/bookingTypes'
import { useCreateAppointments } from '@/services/api/appointments'
import { format } from 'date-fns'
import { ChevronDownIcon, ChevronLeftIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PractitionerAvailbility from '../../practitioner-availbility'

export interface IBookingPractitionerProps {
  params: { practitionerId: string }
}

export default function BookingPractitioner({
  params
}: IBookingPractitionerProps) {
  const router = useRouter()

  const { state: bookingState, dispatch } = useBooking()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const [bookingInformation, setBookingInformation] = useState<IStateBooking>({
    ...bookingState,
    clinician_id: 'DE6CY3DYDSYOB7XH',
    schedule_id: 'DE6CZI76J7U6B7PZ',
    session_type: 'online',
    number_of_sessions: null,
    price_per_session: 100000,
    problem_brief: ''
  })

  const { mutate: submitAppointments, isLoading: submitAppointmentsIsLoading } =
    useCreateAppointments(bookingInformation)

  const handleAvailabilityChange = (key: string, value: any) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }))
  }

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />
          <div className='text-[14px] font-bold text-white'>Booking Form</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <div className='card flex flex-col items-center'>
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
            Nurul {params.practitionerId}
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
        </div>
        <div>
          <div className='mt-4 text-[12px] font-bold'>Date & Time</div>

          <PractitionerAvailbility
            date={bookingInformation.date}
            time={bookingInformation.time}
            isOpen={isOpen}
            onClose={e => setIsOpen(e)}
            onChange={({ date, time }) => {
              if (date) handleAvailabilityChange('date', date)
              if (time) handleAvailabilityChange('time', time)
            }}
          >
            <div className='mt-2 flex w-full cursor-pointer space-x-2'>
              <div
                onClick={() => setIsOpen(true)}
                className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'
              >
                <span className='mr-2 text-[12px] text-[#2C2F35]'>
                  {bookingInformation.date
                    ? format(bookingInformation.date, 'dd MMMM yyyy')
                    : '-/-/-'}
                </span>
                <ChevronDownIcon size={24} color='#2C2F35' />
              </div>
              <div
                onClick={() => setIsOpen(true)}
                className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'
              >
                <span className='mr-2 text-[12px] text-[#2C2F35]'>
                  {bookingInformation?.time || '-:-'}
                </span>
                <ChevronDownIcon size={24} color='#2C2F35' />
              </div>
            </div>
          </PractitionerAvailbility>

          <div className='mt-4 text-[12px] font-bold'>Session Type</div>
          <div className='mt-2 flex space-x-4'>
            <Select disabled defaultValue='offline'>
              <SelectTrigger className='w-[50%] text-[12px] text-[#2C2F35]'>
                <SelectValue placeholder='Offline' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className='text-[12px] text-[#2C2F35]'>
                  <SelectItem value='online'>Online</SelectItem>
                  <SelectItem value='offline'>Offline</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              onChange={e =>
                handleAvailabilityChange('number_of_sessions', e.target.value)
              }
              value={bookingInformation.number_of_sessions}
              placeholder='Number of Sessions'
              type='number'
              className='w-[50%] text-[12px] text-[#2C2F35]'
            />
          </div>
          <div className='mt-4 text-[12px] font-bold'>Problem Brief</div>
          <div className='mt-2'>
            <Textarea
              value={bookingInformation.problem_brief}
              onChange={e =>
                handleAvailabilityChange('problem_brief', e.target.value)
              }
              placeholder='Type your message here.'
              className='text-[12px] text-[#2C2F35]'
            />
          </div>
        </div>
      </div>

      <div className='mt-auto flex w-full items-center justify-between p-4 shadow-[hsla(0,0%,85%,0.25)_0px_-4px_24px_0px]'>
        <div className='flex flex-col'>
          <span className='text-[hsla(220,9%,19%,0.4)]'>Estimate Fee</span>
          <span className='text-[20px] font-bold'>Rp.210.000</span>
        </div>
        {}

        {submitAppointmentsIsLoading ? (
          <div className='ml-2 flex w-[150px] justify-center rounded-[32px] bg-secondary'>
            <LoadingSpinnerIcon
              stroke='white'
              width={32}
              height={32}
              className='animate-spin'
            />
          </div>
        ) : (
          <Button
            onClick={() => submitAppointments()}
            disabled={submitAppointmentsIsLoading}
            className='ml-2 w-[150px] rounded-[32px] bg-secondary text-[14px] font-bold text-white'
          >
            Book Session
          </Button>
        )}
      </div>
    </>
  )
}
