'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Skeleton } from '@/components/ui/skeleton';
import { useGetSingleRecord } from '@/services/api/record';
import type { Condition } from 'fhir/r4';
import { Microscope } from 'lucide-react';

type Props = {
  readonly conditionId: string;
};

/**
 * Detail view for a single Condition resource.
 *
 * Renders evidence codes as bullet points in a card.
 * Follows the same pattern as RecordJournal.
 */
export default function RecordCondition({ conditionId }: Props) {
  const { data: conditionData, isLoading } = useGetSingleRecord({
    id: conditionId,
    resourceType: 'Condition'
  });

  if (isLoading || !conditionData) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton
          count={3}
          className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
        />
      </div>
    );
  }

  const condition = conditionData as unknown as Condition;
  const evidenceBullets =
    condition.evidence
      ?.flatMap(e => e.code?.map(c => c.text).filter(Boolean) ?? [])
      .map(t => `- ${t}`)
      .join('\n') ?? '';

  return (
    <div className='card flex border'>
      <Microscope className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
      <div className='whitespace-pre-wrap'>{evidenceBullets || '-'}</div>
    </div>
  );
}
