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
import {
  ICreateAppointmentsPayload,
  useCreateAppointments
} from '@/services/api/appointments'
import { useDetailClinicianByClinic } from '@/services/clinic'
import { format } from 'date-fns'
import { ChevronDownIcon, ChevronLeftIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import PractitionerAvailbility from '../../practitioner-availbility'

import { conjunction } from '@/lib/utils'

export interface IBookingPractitionerProps {
  params: { practitionerId: string }
}

export default function BookingPractitioner({
  params
}: IBookingPractitionerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clinicId = searchParams.get('clinicId')
  const { state: bookingState, dispatch } = useBooking()

  const [bookingForm, setBookingInformation] = useState({
    number_of_sessions: undefined,
    problem_brief: ''
  })

  const appointmentsPayload: ICreateAppointmentsPayload = {
    ...bookingForm,
    clinician_id:
      bookingState.detailClinicianByClinicianID?.clinician_id || undefined,
    schedule_id: bookingState.detailClinicianByClinicianID?.schedule_id,
    price_per_session:
      bookingState.detailClinicianByClinicianID?.practice_information
        ?.price_per_session.value,
    date: format(bookingState.date, 'yyyy-MM-dd'),
    time: bookingState.time,
    session_type: 'offline'
  }

  const [errorForm, setErrorForm] = useState(undefined)

  const { data: detailClinician, isLoading: isDetailClinicianLoading } =
    useDetailClinicianByClinic({
      clinician_id: params.practitionerId,
      clinic_id: clinicId,
      enable: !bookingState.detailClinicianByClinicianID
    })

  const submitAppointments = useCreateAppointments(appointmentsPayload)

  useEffect(() => {
    dispatch({
      type: 'UPDATE_BOOKING_INFO',
      payload: {
        detailClinicianByClinicianID: detailClinician
      }
    })
  }, [detailClinician])

  const handleBookingInformationChange = (key: string, value: any) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }))
  }

  const handleSubmit = () => {
    let emptyField = Object.entries(appointmentsPayload).filter(
      item => !item[1]
    )

    if (emptyField.length > 0) {
      setErrorForm(emptyField.map(item => item[0]))
    } else {
      submitAppointments.mutate()
    }
  }

  useEffect(() => {
    if (errorForm) {
      if (
        bookingState.date &&
        bookingState.time &&
        bookingForm.number_of_sessions &&
        bookingForm.problem_brief
      )
        setErrorForm(null)
    }
  }, [bookingForm, bookingState.date, bookingState.time])

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

      {isDetailClinicianLoading ||
      !bookingState.detailClinicianByClinicianID ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
            <div className='card flex flex-col items-center'>
              <div className='flex flex-col items-center'>
                <Image
                  className='h-[100px] w-[100px] rounded-full object-cover'
                  src='/images/avatar.jpg'
                  alt='clinic'
                  width={100}
                  height={100}
                />

                <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] bg-[#08979C] text-center font-normal text-white'>
                  {
                    bookingState.detailClinicianByClinicianID
                      .practice_information.affiliation
                  }
                </Badge>
              </div>
              <div className='mt-2 text-center font-bold text-primary'>
                {params.practitionerId}
              </div>
              <div className='mt-2 flex flex-wrap justify-center gap-1'>
                {bookingState.detailClinicianByClinicianID.practice_information.specialties.map(
                  specialty => (
                    <Badge
                      key={specialty}
                      className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                    >
                      {specialty}
                    </Badge>
                  )
                )}
              </div>
            </div>
            <div>
              <div className='mt-4 text-[12px] font-bold'>Date & Time</div>

              <PractitionerAvailbility>
                <div className='mt-2 flex w-full cursor-pointer space-x-2'>
                  <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                    <span className='mr-2 text-[12px] text-[#2C2F35]'>
                      {bookingState.date
                        ? format(bookingState.date, 'dd MMMM yyyy')
                        : '-/-/-'}
                    </span>
                    <ChevronDownIcon size={24} color='#2C2F35' />
                  </div>
                  <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                    <span className='mr-2 text-[12px] text-[#2C2F35]'>
                      {bookingState?.time || '-:-'}
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
                    handleBookingInformationChange(
                      'number_of_sessions',
                      parseInt(e.target.value)
                    )
                  }
                  value={bookingForm.number_of_sessions}
                  placeholder='Number of Sessions'
                  type='number'
                  className='w-[50%] text-[12px] text-[#2C2F35]'
                />
              </div>
              <div className='mt-4 text-[12px] font-bold'>Problem Brief</div>
              <div className='mt-2'>
                <Textarea
                  value={bookingForm.problem_brief}
                  onChange={e =>
                    handleBookingInformationChange(
                      'problem_brief',
                      e.target.value
                    )
                  }
                  placeholder='Type your message here.'
                  className='text-[12px] text-[#2C2F35]'
                />
              </div>
            </div>
            {!errorForm ? null : (
              <div className='mt-2 text-sm text-destructive'>{`Lengkapi ${conjunction(errorForm)}.`}</div>
            )}
          </div>

          <div className='mt-auto flex w-full items-center justify-between p-4 shadow-[hsla(0,0%,85%,0.25)_0px_-4px_24px_0px]'>
            <div className='flex flex-col'>
              <span className='text-[hsla(220,9%,19%,0.4)]'>Estimate Fee</span>
              <span className='text-[20px] font-bold'>Rp.210.000</span>
            </div>

            {submitAppointments.isLoading ? (
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
                onClick={handleSubmit}
                disabled={submitAppointments.isLoading}
                className='ml-2 w-[150px] rounded-[32px] bg-secondary text-[14px] font-bold text-white'
              >
                Book Session
              </Button>
            )}
          </div>
        </>
      )}
    </>
  )
}
