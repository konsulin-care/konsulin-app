'use client';

import Notfound from '@/app/not-found';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useSearchParams } from 'next/navigation';
import RecordDetail from './record-detail';
import RecordEdit from './record-edit';
import RecordTimeline from './record-timeline';

/** Compute the back route for the detail view. */
function computeViewBackRoute(paramPatientId: string | null): string {
  return paramPatientId ? `/record?id=${paramPatientId}` : '/record';
}

/** Compute the back route for the timeline view — /schedule when practitioner views patient record. */
function computeTimelineBackRoute(
  paramPatientId: string | null
): string | undefined {
  return paramPatientId ? '/schedule' : undefined;
}

/**
 * Record page route handler.
 *
 * URL scheme:
 *   /record                              → patient's own timeline
 *   /record?id=<patientId>               → practitioner's patient timeline
 *   /record?id=<patientId>&view=<resourceType>/<resource-id>  → detail view
 *   /record?edit=<resourceType>/<resource-id>                → edit form
 */
export default function RecordPage() {
  const searchParams = useSearchParams();
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const paramPatientId = searchParams.get('id');
  const view = searchParams.get('view');
  const edit = searchParams.get('edit');

  // Resolve patientId: URL param takes precedence, fall back to auth context
  const patientId =
    paramPatientId ??
    (authState.userInfo?.role_name === Roles.Patient
      ? authState.userInfo?.fhirId
      : null);

  // Detail view: requires patient context + view param
  if (patientId && view) {
    const [resourceType, resourceId] = view.split('/');
    const viewBackRoute = computeViewBackRoute(paramPatientId);

    return (
      <RecordDetail
        resourceType={resourceType ?? ''}
        resourceId={resourceId ?? ''}
        backRoute={viewBackRoute}
      />
    );
  }

  // Edit view: requires patient context + edit param
  if (patientId && edit) {
    const [resourceType, resourceId] = edit.split('/');

    return (
      <RecordEdit
        resourceType={resourceType ?? ''}
        resourceId={resourceId ?? ''}
      />
    );
  }

  // Timeline view: requires patient context
  if (patientId) {
    return (
      <RecordTimeline
        patientId={patientId}
        backRoute={computeTimelineBackRoute(paramPatientId)}
      />
    );
  }

  // Still loading auth — show nothing yet
  if (isAuthLoading) {
    return null;
  }

  // No patient context available
  return <Notfound />;
}
