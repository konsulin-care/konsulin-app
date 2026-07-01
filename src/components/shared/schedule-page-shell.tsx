'use client';

import SessionFilter from '@/app/schedule/session-filter';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IUseClinicParams } from '@/services/clinic';
import { format } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import { Fragment, ReactNode, useEffect, useRef } from 'react';

type Props<T> = {
  readonly keyword: string;
  readonly onKeywordChange: (value: string) => void;
  readonly sessionsFilter: IUseClinicParams;
  readonly onFilterChange: (filter: IUseClinicParams) => void;
  readonly selectedTab: string;
  readonly onTabChange: (value: string) => void;
  readonly isLoading: boolean;
  readonly upcoming: readonly T[];
  readonly past: readonly T[];
  readonly renderCard: (item: T) => ReactNode;
  readonly onLoadMore?: () => void;
  readonly hasMore?: boolean;
  readonly isLoadingMore?: boolean;
};

/**
 *
 */
/** Sentinel at bottom of scroll area to trigger next page load. */
function InfiniteScrollSentinel({
  onLoadMore,
  hasMore,
  isLoadingMore
}: {
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !onLoadMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
    /* eslint consistent-return: off -- useEffect cleanup pattern */
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className='h-4'>
      {isLoadingMore && (
        <div className='flex justify-center py-4'>
          <LoadingSpinnerIcon width={24} height={24} className='animate-spin' />
        </div>
      )}
    </div>
  );
}

/**
 *
 */
export default function SchedulePageShell<T extends { appointmentId: string }>({
  keyword,
  onKeywordChange,
  sessionsFilter,
  onFilterChange,
  selectedTab,
  onTabChange,
  isLoading,
  upcoming,
  past,
  renderCard,
  onLoadMore,
  hasMore,
  isLoadingMore
}: Props<T>) {
  return (
    <div className='mt-[-24px] rounded-[16px] bg-white pb-20'>
      <div className='w-full p-4'>
        <div className='flex gap-4'>
          <InputWithIcon
            value={keyword}
            onChange={event => onKeywordChange(event.target.value)}
            placeholder='Search'
            className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
          <SessionFilter
            onChange={(filter: IUseClinicParams) => {
              onFilterChange(filter);
            }}
            type={selectedTab}
            initialFilter={sessionsFilter}
          />
        </div>

        <div className='mb-4 flex gap-4'>
          {sessionsFilter.start_date && sessionsFilter.end_date && (
            <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
              {format(new Date(sessionsFilter.start_date), 'dd MMM yy') +
                ' - ' +
                format(new Date(sessionsFilter.end_date), 'dd MMM yy')}
            </Badge>
          )}
          {sessionsFilter.start_time && sessionsFilter.end_time && (
            <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
              {sessionsFilter.start_time + ' - ' + sessionsFilter.end_time}
            </Badge>
          )}
        </div>

        <Tabs
          defaultValue='upcoming'
          className='w-full'
          value={selectedTab}
          onValueChange={value => onTabChange(value)}
        >
          <TabsList className='grid w-full grid-cols-2 bg-transparent'>
            <TabsTrigger
              className='border-secondary data-[state=active]:text-secondary rounded-none data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:shadow-none'
              value='upcoming'
            >
              Upcoming Session
            </TabsTrigger>
            <TabsTrigger
              className='border-secondary data-[state=active]:text-secondary rounded-none data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:shadow-none'
              value='past'
            >
              Past Session
            </TabsTrigger>
          </TabsList>
          {isLoading ? (
            <Skeleton
              count={4}
              className='mt-4 h-[100px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
            />
          ) : (
            <>
              <TabsContent value='upcoming'>
                {upcoming.length === 0 ? (
                  <EmptyState
                    className='py-16'
                    title='No Upcoming Sessions'
                    subtitle='You have no scheduled sessions at the moment'
                  />
                ) : (
                  upcoming.map(item => (
                    <Fragment key={item.appointmentId}>
                      {renderCard(item)}
                    </Fragment>
                  ))
                )}
              </TabsContent>
              <TabsContent value='past'>
                {past.length === 0 ? (
                  <EmptyState
                    className='py-16'
                    title='No Past Sessions'
                    subtitle="You haven't completed any sessions yet"
                  />
                ) : (
                  past.map(item => (
                    <Fragment key={item.appointmentId}>
                      {renderCard(item)}
                    </Fragment>
                  ))
                )}
              </TabsContent>
            </>
          )}

          <InfiniteScrollSentinel
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        </Tabs>
      </div>
    </div>
  );
}
