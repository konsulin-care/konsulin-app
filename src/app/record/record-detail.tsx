'use client';

import Notfound from '@/app/not-found';
import ModalQr from '@/components/general/modal-qr';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import type { Money, Observation } from 'fhir/r4';
import { PenLine, Repeat2, Sparkles, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  isPatientJournal,
  isSoapNote,
  RESOURCE_RENDERERS,
  RESOURCE_TITLES
} from './record-renderers';
import ReportPaymentDrawer from './report-payment-drawer';
type Props = {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly backRoute?: string;
};

/** Compute the display name from auth state. */
function computeDisplayName(authState: {
  userInfo?: { fullname?: string; email?: string };
}): string | undefined {
  const fullname = authState?.userInfo?.fullname;
  if (fullname && fullname.trim() !== '-') return fullname;
  return authState?.userInfo?.email;
}

/** Render a bar showing the authenticated patient's display name. */
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
/** Resolve the page title using the resource type's title resolver, falling back to 'Detail'. */
function computePageTitle(data: Record<string, unknown> | undefined): string {
  if (!data) return 'Detail';
  const resolver = RESOURCE_TITLES.get(data.resourceType as string);
  return resolver ? resolver(data) : 'Detail';
}
/**
 *
 */
export default function RecordDetail({
  resourceType,
  resourceId,
  backRoute
}: Props) {
  const { data, isLoading, error } = useRecordDetail(
    resourceType,
    resourceId || null
  );
  const { state: authState } = useAuth();

  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [qrOpen, setQrOpen] = useState(false);
  const [reportFee, setReportFee] = useState<Money | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const router = useRouter();
  const { dispatch } = useFab();

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

  // Set FAB state: edit for own journals, Get Report for paid assessments, share otherwise
  useEffect(() => {
    const isNonOwnJournal =
      data?.resourceType === 'Observation' &&
      !isOwnJournal &&
      isPatientJournal(data as unknown as Observation);
    const isPaidAssessment =
      data?.resourceType === 'QuestionnaireResponse' &&
      !isSoapNote(data) &&
      authState.isAuthenticated &&
      reportFee !== null;

    if (!data || error || isNonOwnJournal) {
      dispatch({ type: 'SET_ACTION', config: null });
      dispatch({ type: 'SET_MENU', config: null });
    } else if (isOwnJournal) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Edit',
          icon: PenLine,
          onAction: () => router.push(`/record?edit=Observation/${resourceId}`),
          isSaving: false,
          variant: 'primary'
        }
      });
      dispatch({ type: 'SET_MENU', config: null });
    } else if (isPaidAssessment) {
      // Paid assessment report — FAB opens the payment drawer
      dispatch({ type: 'SET_MENU', config: null });
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Get Report',
          icon: Sparkles,
          onAction: () => setPayOpen(true),
          isSaving: false,
          variant: 'primary'
        }
      });
    } else {
      // Other resources — share record
      dispatch({ type: 'SET_MENU', config: null });
      dispatch({
        type: 'SET_ACTION',
        config: {
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
          },
          isSaving: false,
          variant: 'primary'
        }
      });
    }

    return () => {
      dispatch({ type: 'SET_ACTION', config: null });
      dispatch({ type: 'SET_MENU', config: null });
    };
  }, [
    data,
    error,
    isOwnJournal,
    dispatch,
    currentLocation,
    resourceId,
    router,
    reportFee,
    authState.isAuthenticated
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
        onPractitionerNameChange: handlePractitionerNameChange,
        onFeeChange: setReportFee
      })
    ) : (
      <Notfound />
    );
  };

  return (
    <>
      <PageHeader
        pageIndicator={dynamicTitle ?? pageTitle}
        backRoute={backRoute}
      />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <PatientIdentityBar authState={authState} />
        {renderContent()}
      </div>
      <ModalQr value={currentLocation} open={qrOpen} onOpenChange={setQrOpen} />
      {reportFee !== null && (
        <ReportPaymentDrawer
          open={payOpen}
          onOpenChange={setPayOpen}
          fee={reportFee}
        />
      )}
    </>
  );
}
