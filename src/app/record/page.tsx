'use client';

import Notfound from '@/app/not-found';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useSearchParams } from 'next/navigation';
import RecordDetail from './record-detail';
import RecordTimeline from './record-timeline';

/**
 * Record page route handler.
 *
 * URL scheme:
 *   /record                              → patient's own timeline
 *   /record?id=<patientId>               → practitioner's patient timeline
 *   /record?id=<patientId>&view=<resourceType>/<resource-id>  → detail view
 */
export default function RecordPage() {
  const searchParams = useSearchParams();
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const paramPatientId = searchParams.get('id');
  const view = searchParams.get('view');

  // Resolve patientId: URL param takes precedence, fall back to auth context
  const patientId =
    paramPatientId ??
    (authState.userInfo?.role_name === Roles.Patient
      ? authState.userInfo?.fhirId
      : null);

  // Detail view: requires patient context + view param
  if (patientId && view) {
    const [resourceType, resourceId] = view.split('/');

    return (
      <RecordDetail
        resourceType={resourceType ?? ''}
        resourceId={resourceId ?? ''}
      />
    );
  }

  // Timeline view: requires patient context
  if (patientId) {
    return <RecordTimeline patientId={patientId} />;
  }

  // Still loading auth — show nothing yet
  if (isAuthLoading) {
    return null;
  }

  // No patient context available
  return <Notfound />;
}
