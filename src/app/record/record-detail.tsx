'use client';

import Notfound from '@/app/not-found';
import ModalQr from '@/components/general/modal-qr';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import type { Observation, QuestionnaireResponse } from 'fhir/r4';
import { UsersIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import RecordAssessment from './record-assessment';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

type Props = {
  resourceType: string;
  resourceId: string;
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
/** Compute the display name from auth state. */
function computeDisplayName(authState: {
  userInfo?: { fullname?: string; email?: string };
}): string | undefined {
  const fullname = authState?.userInfo?.fullname;
  if (fullname && fullname.trim() !== '-') return fullname;
  return authState?.userInfo?.email;
}

/** Patient identity bar shown at the top of the detail view. */
function PatientIdentityBar({
  authState
}: {
  authState: {
    isAuthenticated?: boolean;
    userInfo?: { fullname?: string; email?: string };
  };
}) {
  if (!authState?.isAuthenticated) return null;
  const displayName = computeDisplayName(authState);
  if (!displayName) return null;
  return (
    <div className='mb-4 flex items-center rounded-xl border p-4'>
      <UsersIcon className='mr-[10px] shrink-0' color='hsla(220,9%,19%,0.4)' />
      <div className='text-sm font-medium text-[#2c2f35]'>{displayName}</div>
    </div>
  );
}

/** Compute the page title based on resource data. */
function computePageTitle(data: Record<string, unknown> | undefined): string {
  if (!data) return 'Detail';
  const resourceType = data.resourceType;
  if (resourceType === 'QuestionnaireResponse') {
    return isSoapNote(data as unknown as QuestionnaireResponse)
      ? PAGE_TITLES['QuestionnaireResponse/soap']
      : PAGE_TITLES['QuestionnaireResponse/assessment'];
  }
  if (resourceType === 'Observation') {
    if (isPatientJournal(data as unknown as Observation)) {
      return PAGE_TITLES['Observation/journal'];
    }
    if (isPractitionerNote(data as unknown as Observation)) {
      return PAGE_TITLES['Observation/soap'];
    }
  }
  return 'Detail';
}

/**
 * Detail view for a single record.
 *
 * Dispatches to the appropriate sub-component based on
 * the resource type and its content.
 */
export default function RecordDetail({ resourceType, resourceId }: Props) {
  const { data, isLoading, error } = useRecordDetail(
    resourceType,
    resourceId || null
  );
  const { state: authState } = useAuth();

  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [qrOpen, setQrOpen] = useState(false);

  const { setDirtyState } = useFabDirty();

  const handlePractitionerNameChange = useCallback((name: string) => {
    setDynamicTitle(`Notes from ${name}`);
  }, []);

  const pageTitle = useMemo(() => computePageTitle(data), [data]);

  // Capture current URL for sharing
  useEffect(() => {
    setCurrentLocation(window.location.href);
  }, []);

  // Set FAB to "Share Record" for all valid resource detail views
  useEffect(() => {
    if (!data || error) {
      setDirtyState(null);
    } else {
      setDirtyState({
        isDirty: true,
        label: 'Share Record',
        onSave: () => {
          const shareUrl = currentLocation || window.location.href;
          if (typeof navigator.share === 'function') {
            navigator.share({ url: shareUrl }).catch(() => {
              /* user cancelled — do nothing */
            });
          } else {
            setQrOpen(true);
          }
        },
        isSaving: false
      });
    }

    return () => setDirtyState(null);
  }, [data, error, setDirtyState, currentLocation]);

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
          return <RecordSoap soapId={resourceId} />;
        }
        return (
          <RecordAssessment
            recordId={resourceId}
            onTitleChange={setDynamicTitle}
          />
        );
      }
      case 'Observation': {
        const obs = data as unknown as Observation;
        if (isPatientJournal(obs)) {
          return <RecordJournal journalId={resourceId} />;
        }
        if (isPractitionerNote(obs)) {
          return (
            <RecordSoap
              soapId={resourceId}
              onPractitionerNameChange={handlePractitionerNameChange}
            />
          );
        }
        return <Notfound />;
      }
      default: {
        return <Notfound />;
      }
    }
  };

  return (
    <>
      <PageHeader pageIndicator={dynamicTitle ?? pageTitle} />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <PatientIdentityBar authState={authState} />
        {renderContent()}
      </div>
      <ModalQr value={currentLocation} open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
