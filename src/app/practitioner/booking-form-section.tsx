import { LoadingSpinnerIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';

import { Textarea } from '@/components/ui/textarea';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { cn, conjunction } from '@/lib/utils';
import type { PractitionerRole, Schedule } from 'fhir/r4';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { TransitionStartFunction } from 'react';
import { getSlotMinutesText } from './utils';

type Props = {
  bookingForm: { session_type: string; problem_brief: string };
  bookingState: IStateBooking;
  errorForm: string[] | null;
  handleBookingInformationChange: (key: string, value: string) => void;
  handleSubmitForm: () => void;
  scheduleId: string;
  hideCta?: boolean;
  isCreateAppointmentLoading: boolean;
  isPaying: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  practitionerRole: PractitionerRole;
  selectedSlotId: string | null;
  scheduleById: Schedule | undefined;
  router: AppRouterInstance;
  saveIntent: (kind: string, payload: Record<string, unknown>) => void;
  startTransition: TransitionStartFunction;
  setIsOpen: (open: boolean) => void;
  /** First given name of the practitioner for personalized label. */
  practitionerGivenName?: string;
};

/** Booking form with problem brief and submit handler. */
export default function BookingFormSection({
  bookingForm,
  bookingState,
  errorForm,
  handleBookingInformationChange,
  handleSubmitForm,
  scheduleId,
  isCreateAppointmentLoading,
  isPaying,
  isAuthenticated,
  isPending,
  practitionerRole,
  selectedSlotId,
  scheduleById,
  router,
  saveIntent,
  startTransition,
  setIsOpen,
  hideCta = false,
  practitionerGivenName
}: Readonly<Props>) {
  const label = `What should ${practitionerGivenName ?? 'the doctor'} know?`;
  return (
    <>
      <div className='mt-4 text-[12px] font-bold'>
        {label}
        <span className='text-destructive ml-0.5'>*</span>
      </div>
      <div className='mt-2 mb-4'>
        <Textarea
          value={bookingForm.problem_brief}
          onChange={e => {
            handleBookingInformationChange('problem_brief', e.target.value);
          }}
          placeholder='e.g., anxiety attacks for 1 week, persistent low mood since last month, trouble sleeping with racing thoughts'
          className='w-full resize-none bg-white text-[12px] text-[#2C2F35]'
        />
      </div>

      {errorForm && (
        <div className='text-destructive mb-4 text-sm'>
          {`Lengkapi ${conjunction(errorForm)}.`}
        </div>
      )}

      {!hideCta && (
        <>
          {isAuthenticated ? (
            <Button
              className='bg-secondary mt-auto rounded-xl text-white disabled:opacity-50'
              onClick={handleSubmitForm}
              disabled={
                isCreateAppointmentLoading ||
                isPaying ||
                !scheduleId ||
                !bookingState.startTime ||
                !bookingForm.problem_brief.trim()
              }
            >
              {isCreateAppointmentLoading || isPaying ? (
                <LoadingSpinnerIcon
                  stroke='white'
                  width={20}
                  height={20}
                  className='animate-spin'
                />
              ) : (
                `Book Now${getSlotMinutesText(scheduleById)}`
              )}
            </Button>
          ) : (
            <Button
              className='bg-secondary mt-auto w-full rounded-[32px] py-2 text-[14px] font-bold text-white'
              disabled={isPending}
              onClick={() => {
                saveIntent('appointment', {
                  path: `/practitioner?id=${practitionerRole.id}`,
                  slot: {
                    date: bookingState.date,
                    startTime: bookingState.startTime,
                    slotId: selectedSlotId
                  },
                  formData: bookingForm
                });

                startTransition(() => {
                  router.push('/auth');
                });
              }}
            >
              {isPending ? (
                <LoadingSpinnerIcon
                  stroke='white'
                  width={20}
                  height={20}
                  className='animate-spin'
                />
              ) : (
                'Silakan Daftar atau Masuk untuk Booking'
              )}
            </Button>
          )}
          <Button
            onClick={() => {
              setIsOpen(false);
            }}
            variant='outline'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'mt-2 w-full rounded-xl border-0'
            )}
          >
            Batalkan
          </Button>
        </>
      )}
    </>
  );
}
