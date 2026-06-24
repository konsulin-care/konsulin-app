'use client';
/* eslint-disable sonarjs/function-return-type */
/* eslint-disable react/jsx-max-depth */

import RecordFilter, { IRecordParams } from '@/app/record/record-filter';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { IRecord } from '@/types/record';
import { format } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

type Props = {
  readonly pageIndicator: string;
  readonly backRoute: string;
  readonly ctaLink: string;
  readonly ctaTitle: string;
  readonly ctaSubtitle: string;
  readonly ctaImageSrc?: string;
  readonly isLoading: boolean;
  readonly filteredRecords: IRecord[] | null;
  readonly recordFilter: IRecordParams;
  readonly filterTypeLabel: string | undefined;
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (filter: IRecordParams) => void;
  readonly renderCard: (record: IRecord) => ReactNode;
  readonly emptyStateTitle?: string;
  readonly emptyStateSubtitle?: string;
};

/**
 *
 */
export default function RecordPageShell({
  pageIndicator,
  backRoute,
  ctaLink,
  ctaTitle,
  ctaSubtitle,
  ctaImageSrc = '/images/writing.svg',
  isLoading,
  filteredRecords,
  recordFilter,
  filterTypeLabel,
  onSearchChange,
  onFilterChange,
  renderCard,
  emptyStateTitle = 'No Records Found',
  emptyStateSubtitle
}: Props) {
  const ctaCard = (
    <Link href={ctaLink} className='card flex w-full bg-white px-4 py-6'>
      <Image src={ctaImageSrc} width={40} height={40} alt='cta' />
      <div className='ml-2 flex flex-col'>
        <span className='text-primary text-[12px] font-bold'>{ctaTitle}</span>
        <span className='text-primary text-[10px]'>{ctaSubtitle}</span>
      </div>
    </Link>
  );

  return (
    <>
      <PageHeader pageIndicator={pageIndicator} backRoute={backRoute} />

      <ContentWraper className='pt-4'>
        <div className='flex flex-col px-4 pb-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={recordFilter.query}
              onChange={event => onSearchChange(event.target.value)}
              placeholder='Search Entry & Record'
              className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <RecordFilter onChange={onFilterChange} />
          </div>

          <div className='flex gap-4'>
            {recordFilter.start_date && recordFilter.end_date && (
              <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
                {recordFilter.start_date === recordFilter.end_date
                  ? format(recordFilter.start_date, 'dd MMM yy')
                  : `${format(recordFilter.start_date, 'dd MMM yy')} - ${format(recordFilter.end_date, 'dd MMM yy')}`}
              </Badge>
            )}
            {filterTypeLabel && (
              <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
                {filterTypeLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className='bg-[#F9F9F9] p-4'>{ctaCard}</div>

        <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Previous Record Summary
          </div>
          {(() => {
            if (isLoading) {
              return (
                <div className='flex flex-col gap-2'>
                  <Skeleton
                    count={4}
                    className='mt-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]'
                  />
                </div>
              );
            }
            if (filteredRecords && filteredRecords.length > 0) {
              return filteredRecords.map(record => (
                <div key={record.id.split('/')[1]}>{renderCard(record)}</div>
              ));
            }
            return (
              <EmptyState
                className='py-16'
                title={emptyStateTitle}
                subtitle={emptyStateSubtitle}
              />
            );
          })()}
        </div>
      </ContentWraper>
    </>
  );
}
