'use client';

import ActionCard from '@/components/general/action-card';
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

/** Card body containing record title and description (avoids deep JSX nesting). */
function RecordCardContent({
  formattedTitle,
  cleanDescription
}: Readonly<{ formattedTitle: string; cleanDescription: string }>) {
  return (
    <div className='flex-1 overflow-hidden'>
      <div className='truncate text-[12px] font-bold'>{formattedTitle}</div>
      <div className='truncate text-[10px] text-gray-500'>
        <ReactMarkdown components={customMarkdownComponents}>
          {cleanDescription}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/** Card displaying a single record entry. */
function RecordCard({ record }: Readonly<{ record: IRecord }>) {
  const splitTitle = record.title.split('/');
  const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
  const formattedTitle =
    record.type === 'QuestionnaireResponse' ? formatTitle(title) : title;

  const recordId = record.id.split('/')[1];
  const formattedDate = format(new Date(record.lastUpdated), 'dd/MM/yyyy');

  const result = record.result as string;
  const cleanDescription = (result || '-').replaceAll('\n\n', '. ');

  const queryParams = new URLSearchParams({
    category: String(typeMappings[record.type]?.category ?? ''),
    title
  }).toString();
  const url = `/record?recordId=${recordId}&${queryParams}`;

  return (
    <Link href={url} className='card flex flex-col gap-2 p-4'>
      <div className='flex items-center gap-2'>
        <div className='mr-2 h-[40px] w-[40px] shrink-0 rounded-full bg-[#F8F8F8] p-2'>
          <BookText className='h-6 w-6 text-gray-500' />
        </div>
        <RecordCardContent
          formattedTitle={formattedTitle}
          cleanDescription={cleanDescription}
        />
      </div>
      <hr className='w-full' />
      <div className='flex items-center justify-between'>
        <Badge className='rounded-full bg-[#08979C] px-[10px] py-[4px] text-[10px] text-white'>
          {typeMappings[record.type]?.text ?? record.type}
        </Badge>
        <div className='text-[10px] text-gray-500'>{formattedDate}</div>
      </div>
    </Link>
  );
}

/** Patient home page with recommendations, clinic quick link, and records. */
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
    ? (parseRecordBundles(recordsBundle) as IRecord[]).toSorted(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
    : [];

  /** Navigate to the practitioner booking page. */
  const handleBook = (practitionerId: string) => {
    router.push(`/appointment?practitioner=${practitionerId}`);
  };

  /** Renders records list, loading, or error states. */
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
            onClick={() => {
              void refetchRecords();
            }}
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
          {records.slice(0, 10).map((record: IRecord) => (
            <RecordCard key={record.id.split('/')[1]} record={record} />
          ))}
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
        <ActionCard
          icon={<Building2 className='h-5 w-5 text-gray-600' />}
          title='Show All Clinics'
          description='Find practitioners near you'
          href='/clinic'
        />
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
