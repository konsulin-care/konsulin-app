'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Skeleton } from '@/components/ui/skeleton';
import { useGetSingleRecord } from '@/services/api/record';

import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

type Props = {
  journalId: string;
};

/** Formats a date string to readable format. */
function formattedDate(date: string): string {
  return format(new Date(date), 'dd MMMM yyyy');
}

/**
 * Renders a single journal entry with title, dates, and markdown content.
 */
export default function RecordJournal({ journalId }: Props) {
  const { data: journalData, isLoading } = useGetSingleRecord({
    id: journalId,
    resourceType: 'Observation'
  });

  if (isLoading || !journalData) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton
          count={3}
          className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
        />
      </div>
    );
  }

  const title = journalData.valueString ?? '';
  const content = (journalData.note ?? [])
    .map((item: { text: string }) => item.text)
    .join('\n\n');
  const effectiveDateTime: string | undefined = journalData.effectiveDateTime;
  const lastUpdated: string | undefined = journalData.meta?.lastUpdated;

  return (
    <div className='mb-4 rounded-xl border p-4'>
      <p className='text-[14px] font-bold text-[#2c2f35]'>{title}</p>

      {effectiveDateTime && (
        <p className='mt-2 text-xs text-gray-500'>
          Created: {formattedDate(effectiveDateTime)}
        </p>
      )}
      {lastUpdated && (
        <p className='text-xs text-gray-500'>
          Updated: {formattedDate(lastUpdated)}
        </p>
      )}

      <div className='mt-4'>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
