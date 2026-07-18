'use client';

import { Badge } from '@/components/ui/badge';
import { typeMappings } from '@/constants/record';
import type { IRecord } from '@/types/record';
import { customMarkdownComponents, formatTitle } from '@/utils/helper';
import { format } from 'date-fns';
import { FileText, HeartPulse, Microscope } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

/** Icon or avatar for the card's icon slot, based on record type. */
function RecordCardIcon({ record }: Readonly<{ record: IRecord }>) {
  // Practitioner photo avatar
  if (record.type === 'PractitionerNote') {
    const url = record.practitionerProfile?.photo?.[0]?.url;
    if (url) {
      return (
        <Image
          className='h-[24px] w-[24px] rounded-full object-cover'
          src={url}
          width={24}
          height={24}
          alt=''
          unoptimized
        />
      );
    }
    return <FileText className='h-5 w-5 text-gray-500' />;
  }

  // Patient photo avatar
  if (record.type === 'PatientNote') {
    const url = record.patientProfile?.photo?.[0]?.url;
    if (url) {
      return (
        <Image
          className='h-[24px] w-[24px] rounded-full object-cover'
          src={url}
          width={24}
          height={24}
          alt=''
          unoptimized
        />
      );
    }
    return <FileText className='h-5 w-5 text-gray-500' />;
  }

  // Icon-based types
  if (record.type === 'QuestionnaireResponse') {
    return (
      <HeartPulse
        data-testid='icon-assessment'
        className='h-5 w-5 text-gray-500'
      />
    );
  }
  if (record.type === 'Condition') {
    return (
      <Microscope
        data-testid='icon-condition'
        className='h-5 w-5 text-gray-500'
      />
    );
  }

  return (
    <FileText data-testid='icon-fallback' className='h-5 w-5 text-gray-500' />
  );
}

/** Inner content block of a record card (icon + text). */
function RecordCardContent({
  record,
  formattedTitle,
  cleanDescription
}: Readonly<{
  record: IRecord;
  formattedTitle: string;
  cleanDescription: string;
}>) {
  return (
    <div className='flex'>
      <div className='mr-2 flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
        <RecordCardIcon record={record} />
      </div>
      <div className='flex w-0 grow flex-col justify-center'>
        <div className='text-[12px] font-bold'>{formattedTitle}</div>
        <div className='line-clamp-3 overflow-hidden text-[10px] text-ellipsis'>
          <ReactMarkdown components={customMarkdownComponents}>
            {cleanDescription}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

type Props = {
  readonly record: IRecord;
  readonly getPractitionerInfo?: (r: IRecord) => {
    displayName: string;
    email: string;
  };
  readonly formatTitleFor?: string[];
  readonly getDescription?: (record: IRecord) => string;
};

/** Text-only badge and date. */
function RecordCardFooter({
  recordType,
  formattedDate
}: Readonly<{
  recordType: string;
  formattedDate: string;
}>) {
  return (
    <div className='flex items-center justify-between'>
      <Badge className='rounded-full bg-[#08979C] px-[10px] py-[4px] text-[10px] text-white'>
        {typeMappings[recordType]?.text ?? recordType}
      </Badge>
      <div className='text-[10px] text-gray-500'>{formattedDate}</div>
    </div>
  );
}

/** Record card with type-based icon/avatar, title, description, and badge. */
export default function RecordCard({
  record,
  formatTitleFor = [],
  getDescription
}: Props) {
  const splitTitle = record.title.split('/');
  const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
  const formattedTitle =
    formatTitleFor.length === 0 || formatTitleFor.includes(record.type)
      ? formatTitle(title)
      : title;

  const recordId = record.id.split('/')[1];

  const formattedDate = format(new Date(record.lastUpdated), 'dd/MM/yyyy');

  const cleanDescription = getDescription
    ? getDescription(record)
    : ((record.result as string) || '\\-').replace(/\n\n/g, '. ');

  const queryParams = new URLSearchParams({
    category: String(typeMappings[record.type]?.category ?? ''),
    title
  }).toString();
  const url = `/record?id=${recordId}&${queryParams}`;

  return (
    <Link
      key={recordId}
      href={url}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <RecordCardContent
        record={record}
        formattedTitle={formattedTitle}
        cleanDescription={cleanDescription}
      />
      <hr className='w-full' />

      <RecordCardFooter
        recordType={record.type}
        formattedDate={formattedDate}
      />
    </Link>
  );
}
