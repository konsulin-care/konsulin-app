import { Button } from '@/components/ui/button';
import { CalendarBase } from '@/components/ui/calendar-base';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

const today = new Date();

type Props = {
  readonly value?: Date;
  readonly onChange: (date: Date) => void;
};

/** Calendar picker for journal date selection, renders trigger button and drawer. */
export default function CalendarJournal({ onChange, value }: Props) {
  const [date, setDate] = useState<Date | undefined>(value);

  useEffect(() => {
    setDate(value);
  }, [value]);

  /** Handle date selection from calendar, update local and parent state. */
  const handeDateChange = (date: Date) => {
    if (!date) return;
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
          <div className='text-secondary font-bold'>
            {date ? format(date, 'EEEE') : '-'}
          </div>
          <div className='text-muted'>
            {date ? format(date, 'dd/MM/yyyy') : '-'}
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <DrawerTitle />
        <DrawerDescription />
        <div className='mt-4 flex flex-col'>
          <div className='mt-4 flex w-full flex-col justify-center'>
            <CalendarBase
              mode='single'
              selected={date}
              onSelect={date => handeDateChange(date)}
              disabled={{ before: today }}
              className='w-full p-0'
            />
          </div>
          <DrawerClose className='bg-secondary mt-4 w-full rounded-xl p-4 text-center text-white'>
            Kembali
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
