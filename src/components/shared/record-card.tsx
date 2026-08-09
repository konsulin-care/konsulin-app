'use client';

import Avatar from '@/components/general/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import type { IRecord } from '@/types/record';
import {
  isQuestionnaireReference,
  questionnaireIdLabel
} from '@/utils/fhir/questionnaire-url';
import {
  customMarkdownComponents,
  formatTitle,
  generateAvatarPlaceholder
} from '@/utils/helper';
import { resolveQuestionnaireTitle } from '@/utils/parse-searchset-bundles';
import { format } from 'date-fns';
import type { Patient, Practitioner } from 'fhir/r4';
import { FileText, HeartPulse, Microscope } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

/** Build display name from a FHIR Practitioner name. */
function getPractitionerName(profile: Practitioner | undefined): string | null {
  const name = profile?.name?.[0];
  if (!name) return null;
  const prefix = name.prefix?.[0] ?? '';
  const given = (name.given ?? []).join(' ');
  const family = name.family ?? '';
  return [prefix, given, family].filter(Boolean).join(' ');
}

/** Extract display name from a Patient profile. */
function getPatientName(profile: Patient | Practitioner): string {
  const name = profile.name?.[0];
  if (!name) return '';
  return [name.given?.join(' '), name.family].filter(Boolean).join(' ');
}

/** Icon or avatar for the card's icon slot, based on record type. */
function RecordCardIcon({ record }: Readonly<{ record: IRecord }>) {
  /** Build an <Avatar> from a FHIR profile with generated fallback. */
  function renderProfileAvatar(
    profile: Patient | Practitioner,
    getName: (p: Patient | Practitioner) => string
  ) {
    const { initials, seed, backgroundColor } = generateAvatarPlaceholder({
      id: profile.id,
      name: getName(profile) ?? ''
    });
    return (
      <Avatar
        photoUrl={profile.photo?.[0]?.url}
        initials={initials ?? ''}
        backgroundColor={backgroundColor ?? '#13c2c2'}
        seed={seed}
        height={40}
        width={40}
        imageClassName='object-cover'
      />
    );
  }

  // Practitioner photo avatar
  if (record.type === 'PractitionerNote') {
    if (record.practitionerProfile) {
      return renderProfileAvatar(
        record.practitionerProfile,
        p => getPractitionerName(p as Practitioner) ?? ''
      );
    }
    return (
      <FileText data-testid='icon-fallback' className='h-5 w-5 text-gray-500' />
    );
  }

  // Patient photo avatar
  if (record.type === 'PatientNote') {
    if (record.patientProfile) {
      return renderProfileAvatar(record.patientProfile, getPatientName);
    }
    return (
      <FileText data-testid='icon-fallback' className='h-5 w-5 text-gray-500' />
    );
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
  cleanDescription,
  titleLoading
}: Readonly<{
  record: IRecord;
  formattedTitle: string;
  cleanDescription: string;
  titleLoading?: boolean;
}>) {
  return (
    <div className='flex'>
      <div className='mr-2 flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
        <RecordCardIcon record={record} />
      </div>
      <div className='flex w-0 grow flex-col justify-center'>
        {titleLoading ? (
          <Skeleton className='mb-1 h-[14px] w-3/4' />
        ) : (
          <div className='text-[12px] font-bold'>{formattedTitle}</div>
        )}
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
  readonly patientId?: string;
  readonly formatTitleFor?: string[];
  readonly getDescription?: (record: IRecord) => string;
  readonly titlesLoading?: boolean;
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
  patientId,
  formatTitleFor = [],
  getDescription,
  titlesLoading = false
}: Props) {
  /** Compute the formatted title based on record type. */
  const formattedTitle = (() => {
    if (record.type === 'PractitionerNote') {
      return `Notes from ${getPractitionerName(record.practitionerProfile) ?? 'Practitioner'}`;
    }
    if (record.type === 'PatientNote') {
      return record.title;
    }
    // Questionnaire-based records show Questionnaire.title verbatim; when the
    // title is still a canonical reference (resolution pending/failed), fall
    // back to the all-caps questionnaire id.
    if (
      record.type === 'QuestionnaireResponse' ||
      record.type === 'SOAP Notes'
    ) {
      const resolved = resolveQuestionnaireTitle(record);
      return isQuestionnaireReference(record.title)
        ? questionnaireIdLabel(resolved)
        : resolved;
    }
    const splitTitle = record.title.split('/');
    const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
    if (formatTitleFor.length === 0 || formatTitleFor.includes(record.type)) {
      return formatTitle(title);
    }
    return title;
  })();

  const resourceId = record.id.split('/')[1] ?? record.id;

  const formattedDate = format(new Date(record.lastUpdated), 'dd/MM/yyyy');

  const cleanDescription = getDescription
    ? getDescription(record)
    : (record.result as string) || '-';

  const viewParam = encodeURIComponent(record.id);
  const base = `/record?view=${viewParam}`;
  const url = patientId ? `${base}&id=${encodeURIComponent(patientId)}` : base;

  return (
    <Link
      key={resourceId}
      href={url}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <RecordCardContent
        record={record}
        formattedTitle={formattedTitle}
        cleanDescription={cleanDescription}
        titleLoading={
          titlesLoading &&
          (record.type === 'QuestionnaireResponse' ||
            record.type === 'SOAP Notes')
        }
      />
      <hr className='w-full' />

      <RecordCardFooter
        recordType={record.type}
        formattedDate={formattedDate}
      />
    </Link>
  );
}
