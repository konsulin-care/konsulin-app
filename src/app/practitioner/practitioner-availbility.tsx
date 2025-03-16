import EmptyState from '@/components/general/empty-state'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { useBooking } from '@/context/booking/bookingContext'
import { cn } from '@/lib/utils'
import { useFindAvailability } from '@/services/clinicians'
import { addDays, format } from 'date-fns'
import { useState } from 'react'

export default function PractitionerAvailbility({ children }: any) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [isOpen, setIsOpen] = useState(false)
  const { state: bookingState, dispatch } = useBooking()
  const selectedDay = parseInt(format(bookingState.date, 'd'))
  const selectedYear = bookingState.date.getFullYear()
  const selectedMonth = bookingState.date.getMonth() + 1

  const { data: availability, isLoading: isAvailabilityLoading } =
    useFindAvailability({
      year: selectedYear,
      month: selectedMonth,
      practitioner_role_id:
        bookingState.detailClinicianByClinicianID?.practitioner_role_id,
      enable: !!(
        isOpen &&
        bookingState.detailClinicianByClinicianID?.practitioner_role_id
      )
    })

  const availabilityOnselectedDay =
    availability?.data?.days?.[selectedDay - 1]?.available_times || null

  const handleFilterChange = (label: string, value: any) => {
    dispatch({
      type: 'UPDATE_BOOKING_INFO',
      payload: {
        [label]: value
      }
    })
  }

  const listAvailableDate = isAvailabilityLoading
    ? []
    : availability.data.days
        .filter(day => day.available_times !== null)
        .map(item => new Date(item.date)) || []

  console.log({ listAvailableDate })

  return (
    <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
      <DrawerTrigger asChild>
        <div onClick={() => setIsOpen(true)}>{children}</div>
      </DrawerTrigger>
      <DrawerContent
        onInteractOutside={() => setIsOpen(false)}
        className='mx-auto max-w-screen-sm p-4'
      >
        <div className='mt-4'>
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>See Availbility</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <Calendar
                defaultMonth={bookingState.date}
                mode='single'
                selected={bookingState.date}
                onSelect={date => {
                  if (date) {
                    handleFilterChange('date', date)
                    handleFilterChange('time', null)
                  }
                }}
                onMonthChange={params => {
                  if (params.getMonth() === today.getMonth()) {
                    handleFilterChange('date', addDays(today, 1))
                  } else {
                    handleFilterChange('date', params)
                  }
                }}
                disabled={{ before: today }}
                modifiers={{
                  ada: listAvailableDate
                }}
                modifiersClassNames={{ ada: '!text-secondary' }}
                classNames={{
                  month: 'space-y-8 w-full',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                  cell: 'w-full h-9 [&:has([aria-selected].day-outside)]:bg-secondary [&:has([aria-selected].day-outside)]:rounded-md [&:has([aria-selected].day-outside)]:text-accent-foreground  focus-within:z-20',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 p-0 font-normal aria-selected:opacity-100 w-full text-[red]'
                  ),
                  day_selected:
                    'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground !text-white !rounded-md',
                  day_today:
                    'text-accent-foreground font-bold border-b-2 border-secondary rounded-none'
                }}
              />
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>
                {format(bookingState.date, 'dd MMMM yyyy')}
              </div>
              {isAvailabilityLoading ? (
                <div>loading</div>
              ) : !availabilityOnselectedDay?.length ? (
                <div className='flex w-full justify-center'>
                  <EmptyState
                    size={42}
                    title='Jadwal tidak tersedia'
                    subtitle='coba hari lain'
                  />
                </div>
              ) : (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
                  {availabilityOnselectedDay.map(availabilityTime => (
                    <Button
                      variant='outline'
                      key={`${selectedDay} ${availabilityTime}`}
                      onClick={() =>
                        handleFilterChange('time', availabilityTime)
                      }
                      className={cn(
                        'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                        availabilityTime === bookingState.time
                          ? 'bg-secondary font-bold text-white hover:bg-secondary'
                          : 'bg-white font-normal'
                      )}
                    >
                      {availabilityTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button
              className='mt-4 rounded-xl bg-secondary text-white'
              onClick={() => setIsOpen(false)}
            >
              Make an Appointment
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant='outline'
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-4 w-full border-0'
              )}
            >
              Close
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
