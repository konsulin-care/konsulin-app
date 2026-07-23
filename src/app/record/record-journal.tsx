'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { Skeleton } from '@/components/ui/skeleton';
import { useGetSingleRecord } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon } from 'lucide-react';

type Props = {
  journalId: string;
};

/**
 *
 */
export default function RecordJournal({ journalId }: Props) {
  const { data: journalData, isLoading } = useGetSingleRecord({
    id: journalId,
    resourceType: 'Observation'
  });

  /** Formats a date string to readable format. */
  const formattedDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy');
  };

  return isLoading || !journalData ? (
    <div className='flex flex-col gap-4'>
      <Skeleton
        count={3}
        className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
      />
    </div>
  ) : (
    <>
      <div className='card flex items-center bg-[hsla(0,0%,98%,1)]'>
        <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

        <div className='flex grow flex-col'>
          <span className='text-muted text-[10px]'>Journal Create</span>
          <span className='text-[14px] font-bold'>
            {journalData.effectiveDateTime &&
              formattedDate(journalData.effectiveDateTime)}
          </span>
        </div>
        <div className='flex flex-col'>
          <span className='text-muted text-right text-[10px]'>Last Edit</span>
          <span className='text-right text-[14px] font-bold'>
            {journalData.meta.lastUpdated &&
              formattedDate(journalData.meta.lastUpdated)}
          </span>
        </div>
      </div>

      <div className='text-[20px] font-bold'>{journalData.valueString}</div>

      {journalData.note.map((item: { text: string }) => (
        <p
          key={item.text.slice(0, 32) || 'note'}
          className='text-[14px] leading-relaxed text-gray-700'
        >
          {item.text}
        </p>
      ))}
    </>
  );
}
