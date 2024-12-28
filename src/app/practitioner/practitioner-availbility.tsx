import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'
import { useEffect, useState } from 'react'

const filterContentListTime = [
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30'
]

export default function PractitionerAvailbility({
  children,
  isOpen = false,
  onClose,
  onChange,
  date,
  time
}: any) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [filter, setFilter] = useState({
    date: date || addDays(today, 1),
    time
  })

  const handleFilterChange = (label: string, value: any) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  useEffect(() => {
    onChange(filter)
  }, [filter])

  return (
    <Drawer onClose={() => onClose(false)} open={isOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent
        onInteractOutside={() => onClose(false)}
        className='mx-auto max-w-screen-sm p-4'
      >
        <div className='mt-4'>
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>See Availbility</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <Calendar
                mode='single'
                selected={filter.date}
                onSelect={date => {
                  if (date) handleFilterChange('date', date)
                }}
                disabled={{ before: new Date() }}
                classNames={{
                  month: 'space-y-8 w-full',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                  cell: 'w-full h-9 [&:has([aria-selected].day-outside)]:bg-secondary [&:has([aria-selected].day-outside)]:rounded-md [&:has([aria-selected].day-outside)]:text-accent-foreground  focus-within:z-20',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 p-0 font-normal aria-selected:opacity-100 w-full'
                  ),
                  day_selected:
                    'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground text-white !rounded-md',
                  day_today:
                    'text-accent-foreground font-bold border-b-2 border-secondary rounded-none'
                }}
              />
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>
                {format(filter.date, 'dd MMMM yyyy')}
              </div>
              <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
                {filterContentListTime.map(time => (
                  <Button
                    variant='outline'
                    key={time}
                    onClick={() => handleFilterChange('time', time)}
                    className={cn(
                      'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                      time === filter.time
                        ? 'bg-secondary font-bold text-white hover:bg-secondary'
                        : 'bg-white font-normal'
                    )}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className='mt-4 rounded-xl bg-secondary text-white'
              onClick={() => onClose(false)}
            >
              Make an Appointment
            </Button>
            <Button
              onClick={() => onClose(false)}
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
