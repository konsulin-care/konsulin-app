'use client';

import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { conjunction, getFromLocalStorage } from '@/lib/utils';
import { useCreateAppointment } from '@/services/api/appointments';
import { useDetailPractitioner } from '@/services/clinic';
import { mergeNames } from '@/utils/helper';
import { addMinutes, format, parse } from 'date-fns';
import { Bundle, CodeableConcept } from 'fhir/r4';
import { ChevronDownIcon, ChevronLeftIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import PractitionerAvailbility from '../../practitioner-availbility';

export interface IBookingPractitionerProps {
  params: { practitionerId: string };
}

export default function BookingPractitioner({
  params
}: IBookingPractitionerProps) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { state: bookingState } = useBooking();
  const [bookingForm, setBookingInformation] = useState({
    number_of_sessions: 1,
    session_type: 'offline',
    problem_brief: ''
  });
  const [errorForm, setErrorForm] = useState(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const {
    mutateAsync: createAppointment,
    isLoading: isCreateAppointmentLoading
  } = useCreateAppointment();

  const practitionerData = JSON.parse(
    getFromLocalStorage(`practitioner-${params.practitionerId}`)
  );
  const patientId = authState?.userInfo?.fhirId;
  const practitionerRoleId = practitionerData?.roleId;

  const {
    newData: detailPractitioner,
    isLoading: isDetailPractitionerLoading
  } = useDetailPractitioner(practitionerRoleId);

  const handleBookingInformationChange = (key: string, value: any) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

  const handleSubmitForm = async () => {
    const { date, startTime, scheduleId } = bookingState;
    const conditionRandomUUID = uuidv4();
    const slotRandomUUID = uuidv4();
    const requiredData = {
      'Problem Brief': bookingForm.problem_brief,
      // scheduleId,
      'Tanggal Appointment': date,
      'Jam Appointment': startTime,
      'Tipe Session': bookingForm.session_type,
      'Jumlah Session': bookingForm.number_of_sessions
      // patientId,
      // practitionerRoleId
    };

    let emptyField = Object.entries(requiredData).filter(item => !item[1]);

    if (emptyField.length > 0) {
      setErrorForm(emptyField.map(item => item[0]));
    } else {
      const formattedStartTime = parse(startTime, 'HH:mm', date).toISOString();
      const formattedEndTime = addMinutes(formattedStartTime, 30).toISOString();

      // NOTE: hardcoded practitionerRoleId
      const appointmentPayload: Bundle = {
        type: 'transaction',
        resourceType: 'Bundle',
        entry: [
          {
            request: {
              method: 'PUT',
              url: `Condition/${conditionRandomUUID}`
            },
            resource: {
              evidence: [
                {
                  code: [
                    {
                      text: bookingForm.problem_brief
                    }
                  ]
                }
              ],
              resourceType: 'Condition',
              asserter: {
                reference: `Patient/${patientId}`
              },
              id: conditionRandomUUID,
              subject: {
                reference: `Patient/${patientId}`
              }
            }
          },
          {
            request: {
              method: 'PUT',
              url: `Slot/${slotRandomUUID}`
            },
            resource: {
              schedule: {
                reference: `Schedule/${scheduleId}`
              },
              start: formattedStartTime,
              resourceType: 'Slot',
              status: 'busy-unavailable',
              id: slotRandomUUID,
              end: formattedEndTime
            }
          },
          {
            request: {
              method: 'POST',
              url: 'Appointment'
            },
            resource: {
              slot: [
                {
                  reference: `Slot/${slotRandomUUID}`
                }
              ],
              participant: [
                {
                  status: 'accepted',
                  actor: {
                    reference: `Patient/${patientId}`
                  }
                },
                {
                  status: 'accepted',
                  actor: {
                    reference: `Practitioner/${params.practitionerId}`
                  }
                },
                {
                  status: 'accepted',
                  actor: {
                    reference: `PractitionerRole/PractitionerRole-id`
                  }
                }
              ],
              resourceType: 'Appointment',
              appointmentType: {
                text: bookingForm.session_type
              },
              status: 'booked',
              reasonReference: [
                {
                  reference: `Condition/${conditionRandomUUID}`
                }
              ]
            }
          }
        ]
      };
      const result = await createAppointment(appointmentPayload);
      if (result && result.length > 0) {
        setIsOpen(true);
      }
    }
  };

  const displayName = useMemo(() => {
    const name = mergeNames(
      practitionerData?.name,
      practitionerData?.qualification
    );

    return name;
  }, [practitionerData]);

  useEffect(() => {
    if (errorForm) {
      if (
        bookingState?.date &&
        bookingState?.startTime &&
        bookingState?.scheduleId &&
        bookingForm.number_of_sessions &&
        bookingForm.session_type &&
        bookingForm.problem_brief
      )
        setErrorForm(null);
    }
  }, [
    bookingForm,
    bookingState.date,
    bookingState.startTime,
    bookingState.endTime
  ]);

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
        <Image
          className='rounded-[8px] object-cover p-6'
          src={'/images/booking-success.png'}
          height={0}
          width={200}
          style={{ width: 'auto', height: 'auto' }}
          alt='success'
        />
        <DrawerTitle className='mb-2 text-center text-2xl font-bold'>
          Selamat! Anda Telah Berhasil Memesan Sesi Konsultasi
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='px-4 text-center text-sm opacity-50'>
        Pemesanan Anda telah berhasil, dan kami telah mencatat detail sesi
        konsultasi Anda
      </DrawerDescription>

      <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
        <Button
          className='h-full w-full rounded-xl bg-secondary p-4 text-white'
          onClick={() => router.push('/')}
        >
          Close
        </Button>
      </DrawerFooter>
    </>
  );

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

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {!practitionerData ? (
          <EmptyState
            className='py-16'
            title='Practitioner Not Found'
            subtitle='Please return to the clinic page and select a practitioner.'
          />
        ) : isDetailPractitionerLoading || isAuthLoading ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <>
            <div className='card flex flex-col items-center'>
              <div className='flex flex-col items-center'>
                <Image
                  className='h-[100px] w-[100px] rounded-full object-cover'
                  src={
                    practitionerData.photo
                      ? practitionerData.photo[0].url
                      : '/images/avatar.jpg'
                  }
                  alt='practitioner'
                  width={100}
                  height={100}
                  unoptimized
                />

                <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] bg-[#08979C] text-center font-normal text-white'>
                  {detailPractitioner?.organization?.name}
                </Badge>
              </div>
              <div className='mt-2 text-center font-bold text-primary'>
                {displayName}
              </div>
              <div className='mt-2 flex flex-wrap justify-center gap-1'>
                {detailPractitioner.resource.specialty &&
                  detailPractitioner.resource.specialty.map(
                    (specialty: CodeableConcept, index: number) => (
                      <Badge
                        key={index}
                        className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                      >
                        {specialty.text}
                      </Badge>
                    )
                  )}
              </div>
            </div>
            <div>
              <div className='mt-4 text-[12px] font-bold'>Date & Time</div>
              <PractitionerAvailbility
                practitionerRole={detailPractitioner.resource}
              >
                <div className='mt-2 flex w-full cursor-pointer space-x-2'>
                  <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                    <span className='mr-2 text-[12px] text-[#2C2F35]'>
                      {bookingState?.date
                        ? format(bookingState.date, 'dd MMMM yyyy')
                        : '-/-/-'}
                    </span>
                    <ChevronDownIcon size={24} color='#2C2F35' />
                  </div>
                  <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                    <span className='mr-2 text-[12px] text-[#2C2F35]'>
                      {bookingState?.startTime || '-:-'}
                    </span>
                    <ChevronDownIcon size={24} color='#2C2F35' />
                  </div>
                </div>
              </PractitionerAvailbility>
              <div className='mt-4 text-[12px] font-bold'>Session Type</div>
              <div className='mt-2 flex space-x-4'>
                <Select disabled>
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
                  min={1}
                  onChange={e => {
                    const value = e.target.value;
                    const number = Number(value);

                    handleBookingInformationChange(
                      'number_of_sessions',
                      value === '' ? 1 : number
                    );
                  }}
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

            <div className='mt-auto flex w-full items-center justify-between p-4 shadow-[hsla(0,0%,85%,0.25)_0px_-4px_24px_0px]'>
              <div className='flex flex-col'>
                <span className='text-[hsla(220,9%,19%,0.4)]'>
                  Estimate Fee
                </span>
                <span className='text-[20px] font-bold'>
                  {detailPractitioner.invoice?.totalNet
                    ? `${new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: detailPractitioner.invoice.totalNet.currency,
                        minimumFractionDigits: 0
                      }).format(detailPractitioner.invoice.totalNet.value)}`
                    : '-'}
                </span>
              </div>

              <Button
                onClick={handleSubmitForm}
                disabled={isCreateAppointmentLoading}
                className='ml-2 w-[150px] rounded-[32px] bg-secondary text-[14px] font-bold text-white'
              >
                {isCreateAppointmentLoading ? (
                  <LoadingSpinnerIcon
                    stroke='white'
                    width={20}
                    height={20}
                    className='animate-spin'
                  />
                ) : (
                  'Book Session'
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      <Drawer open={isOpen} onOpenChange={() => setIsOpen(false)}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}
