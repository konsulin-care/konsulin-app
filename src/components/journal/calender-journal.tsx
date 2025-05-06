import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

const today = new Date();

export default function CalendarJournal({ onChange, value }) {
  const [date, setDate] = useState<Date | undefined>(value);

  useEffect(() => {
    setDate(value);
  }, [value]);

  const handeDateChange = date => {
    setDate(date);
    onChange(date);
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant='ghost'
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-0 p-4'
          )}
        >
          <div className='font-bold text-secondary'>{format(date, 'EEEE')}</div>
          <div className='text-muted'>{format(date, 'dd/MM/yyyy')}</div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <div className='mt-4 flex flex-col'>
          <div className='mt-4 flex w-full flex-col justify-center'>
            <Calendar
              mode='single'
              selected={date}
              onSelect={date => handeDateChange(date)}
              disabled={{ before: today }}
              className='w-full p-0'
              classNames={{
                month: 'space-y-8 w-full',
                head_row: 'flex w-full',
                head_cell:
                  'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                cell: 'w-full h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-9 p-0 font-normal aria-selected:opacity-100 w-full'
                ),
                day_selected:
                  'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground',
                day_today: 'bg-accent text-accent-foreground font-extrabold'
              }}
            />
          </div>
          <DrawerClose className='flex'>
            <Button className='mt-4 w-full rounded-xl bg-secondary p-4 text-white'>
              Kembali
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
