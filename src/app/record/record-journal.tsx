'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSingleRecord } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon, NotepadTextIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  journalId: string;
};

/**
 *
 */
export default function RecordJournal({ journalId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleParam = searchParams?.get('title');
  const categoryParam = searchParams?.get('category');
  const recordId = searchParams?.get('recordId');
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

      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>{journalData.valueString}</div>
      </div>

      {journalData.note.map((item: { text: string }) => {
        return (
          <div key={item.text}>
            <div className='text-muted mb-2 text-[12px]'>
              Write anything here
            </div>

            <div className='card flex text-[14px]'>
              <div>{item.text}</div>
            </div>
          </div>
        );
      })}

      <Button
        onClick={() => {
          const queryParams = new URLSearchParams({
            recordId: recordId ?? journalId,
            category: categoryParam,
            title: titleParam
          }).toString();
          router.push(`/record/edit?${queryParams}`);
        }}
        className='bg-secondary !mt-auto w-full rounded-full p-4 text-[14px] text-white'
      >
        Edit Journal
      </Button>
    </>
  );
}
