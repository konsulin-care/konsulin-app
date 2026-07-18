'use client';

import Notfound from '@/app/not-found';
import { LoadingSpinnerIcon } from '@/components/icons';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import type { Observation, QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';
import RecordAssessment from './record-assessment';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

type Props = {
  resourceType: string;
  resourceId: string;
  title: string;
};

/**
 * Determine whether an Observation is a patient journal (LOINC 51855-5).
 */
function isPatientJournal(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => c.system === 'https://loinc.org' && c.code === '51855-5'
    ) ?? false
  );
}

/**
 * Determine whether an Observation is a practitioner note (LOINC 67855-7).
 */
function isPractitionerNote(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => c.system === 'https://loinc.org' && c.code === '67855-7'
    ) ?? false
  );
}

/**
 * Determine whether a QuestionnaireResponse is a SOAP note.
 */
function isSoapNote(resource: QuestionnaireResponse): boolean {
  return resource.questionnaire === 'Questionnaire/soap';
}

const PAGE_TITLES: Record<string, string> = {
  'QuestionnaireResponse/soap': 'SOAP Detail',
  'QuestionnaireResponse/assessment': 'Assessment Result',
  'Observation/journal': 'Journal Detail',
  'Observation/soap': 'SOAP Detail'
};

/**
 * Detail view for a single record.
 *
 * Dispatches to the appropriate sub-component based on
 * the resource type and its content.
 */
export default function RecordDetail({
  resourceType,
  resourceId,
  title
}: Props) {
  const { data, isLoading, error } = useRecordDetail(
    resourceType,
    resourceId || null
  );

  const pageTitle = useMemo(() => {
    if (!data) return 'Detail';
    if (data.resourceType === 'QuestionnaireResponse') {
      return isSoapNote(data as unknown as QuestionnaireResponse)
        ? PAGE_TITLES['QuestionnaireResponse/soap']
        : PAGE_TITLES['QuestionnaireResponse/assessment'];
    }
    if (data.resourceType === 'Observation') {
      if (isPatientJournal(data as unknown as Observation)) {
        return PAGE_TITLES['Observation/journal'];
      }
      if (isPractitionerNote(data as unknown as Observation)) {
        return PAGE_TITLES['Observation/soap'];
      }
    }
    return 'Detail';
  }, [data]);

  // Invalid props
  if (!resourceType || !resourceId) {
    return <Notfound />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className='flex min-h-screen min-w-full items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  // Error or no data after loading
  if (error || !data) {
    return <Notfound />;
  }

  /** Render the appropriate sub-component based on resource type. */
  const renderContent = () => {
    switch (data.resourceType) {
      case 'QuestionnaireResponse': {
        const qr = data as unknown as QuestionnaireResponse;
        if (isSoapNote(qr)) {
          return <RecordSoap soapId={resourceId} title={title} />;
        }
        return <RecordAssessment recordId={resourceId} title={title} />;
      }
      case 'Observation': {
        const obs = data as unknown as Observation;
        if (isPatientJournal(obs)) {
          return <RecordJournal journalId={resourceId} />;
        }
        if (isPractitionerNote(obs)) {
          return <RecordSoap soapId={resourceId} title={title} />;
        }
        return <Notfound />;
      }
      default: {
        return <Notfound />;
      }
    }
  };

  return (
    <div className='flex grow flex-col space-y-4'>
      <div className='mx-4 mt-4'>
        <h1 className='text-lg font-bold'>{pageTitle}</h1>
      </div>
      <div className='flex grow flex-col space-y-4 rounded-t-[16px] bg-white p-4'>
        {renderContent()}
      </div>
    </div>
  );
}
