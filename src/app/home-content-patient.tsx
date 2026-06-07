'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { useAuth } from '@/context/auth/authContext';
import { useRecordSummaryQuery } from '@/services/api/record';
import { IRecord } from '@/types/record';
import { customMarkdownComponents, formatTitle } from '@/utils/helper';
import { parseRecordBundles } from '@/utils/record-parser';
import { format } from 'date-fns';
import { BookText, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const RecommendationCardStack = dynamic(
  () => import('@/components/general/home/recommendation-card-stack'),
  { ssr: false }
);

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false
});

export default function HomeContentPatient() {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const patientId = authState?.userInfo?.fhirId;

  const {
    data: recordsBundle,
    isLoading: isRecordsLoading,
    isError: isRecordsError,
    refetch: refetchRecords
  } = useRecordSummaryQuery(patientId);

  const records = recordsBundle
    ? (parseRecordBundles(recordsBundle) as IRecord[]).sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
    : [];

  const handleBook = (practitionerId: string) => {
    router.push(`/appointment?practitioner=${practitionerId}`);
  };

  const renderRecordsContent = () => {
    if (isAuthLoading || isRecordsLoading) {
      return (
        <div className='space-y-3'>
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        </div>
      );
    }
    if (isRecordsError) {
      return (
        <div className='rounded-lg bg-[#F9F9F9] p-4 text-center'>
          <p className='mb-2 text-[12px] text-gray-500'>
            Failed to load records
          </p>
          <button
            onClick={() => refetchRecords()}
            className='text-secondary text-[12px] underline'
          >
            Tap to retry
          </button>
        </div>
      );
    }
    if (records.length > 0) {
      return (
        <div className='flex flex-col gap-3'>
          {records.slice(0, 10).map((record: IRecord) => {
            const splitTitle = record.title.split('/');
            const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
            const formattedTitle =
              record.type === 'QuestionnaireResponse'
                ? formatTitle(title)
                : title;

            const recordId = record.id.split('/')[1];
            const formattedDate = format(
              new Date(record.lastUpdated),
              'dd/MM/yyyy'
            );

            const result = record.result as string;
            const cleanDescription = (result || '-').replaceAll(/\n\n/g, '. ');

            const queryParams = new URLSearchParams({
              category: typeMappings[record.type]?.category,
              title
            }).toString();
            const url = `/record?recordId=${recordId}&${queryParams}`;

            return (
              <Link
                key={recordId}
                href={url}
                className='card flex flex-col gap-2 p-4'
              >
                <div className='flex items-center gap-2'>
                  <div className='mr-2 h-[40px] w-[40px] shrink-0 rounded-full bg-[#F8F8F8] p-2'>
                    <BookText className='h-6 w-6 text-gray-500' />
                  </div>
                  <div className='flex-1 overflow-hidden'>
                    <div className='truncate text-[12px] font-bold'>
                      {formattedTitle}
                    </div>
                    <div className='truncate text-[10px] text-gray-500'>
                      <ReactMarkdown components={customMarkdownComponents}>
                        {cleanDescription}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
                <hr className='w-full' />
                <div className='flex items-center justify-between'>
                  <Badge className='rounded-full bg-[#08979C] px-[10px] py-[4px] text-[10px] text-white'>
                    {typeMappings[record.type]?.text ?? record.type}
                  </Badge>
                  <div className='text-[10px] text-gray-500'>
                    {formattedDate}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      );
    }
    return (
      <div className='rounded-lg bg-[#F9F9F9] p-4 text-center text-[12px] text-gray-500'>
        No records yet. Complete an assessment to see it here.
      </div>
    );
  };

  return (
    <>
      {/* PRIMARY: Recommendation Card Stack */}
      <div className='overflow-x-hidden px-0 pt-4'>
        <RecommendationCardStack onBook={handleBook} />
      </div>

      {/* SECONDARY: Quick Actions */}
      <div className='px-4 pb-4'>
        <Link
          href='/clinic'
          className='card flex w-full items-center gap-3 p-4'
        >
          <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
            <Building2 className='h-5 w-5 text-gray-600' />
          </div>
          <div className='flex flex-col'>
            <span className='text-primary text-[12px] font-bold'>
              Show All Clinics
            </span>
            <span className='text-primary text-[10px]'>
              Find practitioners near you
            </span>
          </div>
        </Link>
      </div>

      {/* BELOW FOLD: Previous Records */}
      <div className='p-4'>
        <div className='text-muted flex justify-between'>
          <span className='mb-2 text-[14px] font-bold'>Previous Records</span>
          <Link className='text-[12px]' href='/record'>
            See All
          </Link>
        </div>

        {renderRecordsContent()}
      </div>
    </>
  );
}
