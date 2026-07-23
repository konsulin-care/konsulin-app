'use client';
/* eslint-disable max-lines */
import Notfound from '@/app/not-found';
import ModalQr from '@/components/general/modal-qr';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useFabMenu } from '@/context/fabMenuContext';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import { useDeleteJournal } from '@/services/api/record';
import { isLoincSystem } from '@/utils/fhir';
import type { Observation, QuestionnaireResponse } from 'fhir/r4';
import { PenLine, Repeat2, SquarePen, Trash2, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import RecordAssessment from './record-assessment';
import RecordCondition from './record-condition';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';
type Props = {
  readonly resourceType: string;
  readonly resourceId: string;
};
/** Check if Observation is a patient journal (LOINC 51855-5). */
function isPatientJournal(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => isLoincSystem(c.system) && c.code === '51855-5'
    ) ?? false
  );
}

/** Check if Observation is a practitioner note (LOINC 67855-7). */
function isPractitionerNote(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => isLoincSystem(c.system) && c.code === '67855-7'
    ) ?? false
  );
}

/** Check if QuestionnaireResponse is a SOAP note. */
function isSoapNote(resource: QuestionnaireResponse): boolean {
  return resource.questionnaire === 'Questionnaire/soap';
}

type RenderHandler = (props: {
  resourceId: string;
  data: Record<string, unknown>;
  onTitleChange?: (title: string) => void;
  onPractitionerNameChange?: (name: string) => void;
}) => ReactNode;

/**
 *
 */
export function renderCondition({
  resourceId
}: {
  readonly resourceId: string;
}): ReactNode {
  return <RecordCondition conditionId={resourceId} />;
}

/**
 *
 */
export function renderQuestionnaireResponse({
  resourceId,
  data,
  onTitleChange
}: {
  readonly resourceId: string;
  readonly data: Record<string, unknown>;
  readonly onTitleChange?: (title: string) => void;
}): ReactNode {
  const qr = data as unknown as QuestionnaireResponse;
  if (isSoapNote(qr)) {
    return <RecordSoap soapId={resourceId} />;
  }
  return (
    <RecordAssessment recordId={resourceId} onTitleChange={onTitleChange} />
  );
}

/**
 *
 */
export function renderObservation({
  resourceId,
  data,
  onPractitionerNameChange
}: {
  readonly resourceId: string;
  readonly data: Record<string, unknown>;
  readonly onPractitionerNameChange?: (name: string) => void;
}): ReactNode {
  const obs = data as unknown as Observation;
  if (isPatientJournal(obs)) {
    return <RecordJournal journalId={resourceId} />;
  }
  if (isPractitionerNote(obs)) {
    return (
      <RecordSoap
        soapId={resourceId}
        onPractitionerNameChange={onPractitionerNameChange}
      />
    );
  }
  return <Notfound />;
}

const RESOURCE_RENDERERS = new Map<string, RenderHandler>([
  ['Condition', renderCondition],
  ['QuestionnaireResponse', renderQuestionnaireResponse],
  ['Observation', renderObservation]
]);

/**
 *
 */
export function conditionTitle(): string {
  return 'Condition Detail';
}

/**
 *
 */
export function questionnaireResponseTitle(
  data: Record<string, unknown>
): string {
  if (isSoapNote(data as unknown as QuestionnaireResponse)) {
    return 'SOAP Detail';
  }
  return 'Assessment Result';
}

/**
 *
 */
export function observationTitle(data: Record<string, unknown>): string {
  if (isPatientJournal(data as unknown as Observation)) {
    return 'Journal Detail';
  }
  if (isPractitionerNote(data as unknown as Observation)) {
    return 'SOAP Detail';
  }
  return 'Detail';
}

const RESOURCE_TITLES = new Map<
  string,
  (data: Record<string, unknown>) => string
>([
  ['Condition', conditionTitle],
  ['QuestionnaireResponse', questionnaireResponseTitle],
  ['Observation', observationTitle]
]);
/** Compute the display name from auth state. */
function computeDisplayName(authState: {
  userInfo?: { fullname?: string; email?: string };
}): string | undefined {
  const fullname = authState?.userInfo?.fullname;
  if (fullname && fullname.trim() !== '-') return fullname;
  return authState?.userInfo?.email;
}

function PatientIdentityBar({
  authState
}: Readonly<{
  authState: {
    isAuthenticated?: boolean;
    userInfo?: { fullname?: string; email?: string };
  };
}>) {
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
function computePageTitle(data: Record<string, unknown> | undefined): string {
  if (!data) return 'Detail';
  const resolver = RESOURCE_TITLES.get(data.resourceType as string);
  return resolver ? resolver(data) : 'Detail';
}
/**
 *
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

  const router = useRouter();
  const { setDirtyState } = useFabDirty();
  const { setMenuState } = useFabMenu();
  const { mutateAsync: deleteJournal } = useDeleteJournal();

  const handlePractitionerNameChange = useCallback((name: string) => {
    setDynamicTitle(`Notes from ${name}`);
  }, []);

  const pageTitle = useMemo(() => computePageTitle(data), [data]);

  // Capture current URL for sharing
  useEffect(() => {
    setCurrentLocation(window.location.href);
  }, []);

  // Check if resource is the current patient's own journal
  const isOwnJournal = useMemo(() => {
    if (data?.resourceType !== 'Observation') return false;
    const obs = data as unknown as Observation;
    if (!isPatientJournal(obs)) return false;
    const patientRef = `Patient/${authState.userInfo?.fhirId}`;
    return obs.subject?.reference === patientRef;
  }, [data, authState.userInfo?.fhirId]);

  // Set FAB state: custom menu for own journals, dirty+icon for other records
  useEffect(() => {
    if (!data || error) {
      setDirtyState(null);
      setMenuState(null);
    } else if (isOwnJournal) {
      setDirtyState(null);
      setMenuState({
        icon: SquarePen,
        actions: [
          {
            label: 'Delete',
            icon: Trash2,
            onAction: async () => {
              if (window.confirm('Delete this journal entry?')) {
                try {
                  await deleteJournal(resourceId);
                } catch {
                  /* error handled by toast inside mutation */
                }
              }
            }
          },
          {
            label: 'Edit',
            icon: PenLine,
            onAction: () => {
              router.push(`/record?edit=Observation/${resourceId}`);
            }
          },
          {
            label: 'Share Record',
            icon: Repeat2,
            onAction: () => {
              const shareUrl = currentLocation || window.location.href;
              if (typeof navigator.share === 'function') {
                navigator.share({ url: shareUrl }).catch(() => {
                  /* user cancelled — do nothing */
                });
              } else {
                setQrOpen(true);
              }
            }
          }
        ]
      });
    } else if (!isOwnJournal) {
      setMenuState(null);
      setDirtyState({
        isDirty: true,
        label: 'Share Record',
        icon: Repeat2,
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

    return () => {
      setDirtyState(null);
      setMenuState(null);
    };
  }, [
    data,
    error,
    isOwnJournal,
    setDirtyState,
    setMenuState,
    currentLocation,
    resourceId,
    router,
    deleteJournal
  ]);

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
  const renderContent = (): ReactNode => {
    const renderer = RESOURCE_RENDERERS.get(data.resourceType as string);
    return renderer ? (
      renderer({
        resourceId,
        data,
        onTitleChange: setDynamicTitle,
        onPractitionerNameChange: handlePractitionerNameChange
      })
    ) : (
      <Notfound />
    );
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
