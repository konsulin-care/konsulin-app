/** Database name constant. */
export const DB_NAME = 'konsulin';

/** Database version constant. */
export const DB_VERSION = 3;

/** Store name constants for IndexedDB object stores. */
export const STORES = {
  guestSessions: 'guest_sessions',
  assessmentDrafts: 'assessment_drafts',
  soapDrafts: 'soap_drafts',
  serviceRequests: 'service_requests',
  tempBooking: 'temp_booking',
  uiPreferences: 'ui_preferences',
  navigationState: 'navigation_state',
  userProfile: 'user_profile',
  pendingSubmissions: 'pending_submissions'
} as const;

/** Union type of all valid store names. */
export type StoreName = (typeof STORES)[keyof typeof STORES];

/** A submission that failed to send and is waiting for a replay attempt. */
export type PendingSubmission<T = unknown> = {
  id: string;
  ownerId: string;
  kind: string;
  payload: T;
  createdAt: number;
  attempts: number;
};

/** Schema definitions for each object store. */
export const STORE_SCHEMAS: { name: StoreName; keyPath: string | string[] }[] =
  [
    { name: STORES.guestSessions, keyPath: 'guest_id' },
    { name: STORES.assessmentDrafts, keyPath: ['ownerId', 'questionnaireId'] },
    { name: STORES.soapDrafts, keyPath: ['practitionerId', 'patientId'] },
    { name: STORES.serviceRequests, keyPath: 'id' },
    { name: STORES.tempBooking, keyPath: 'ownerId' },
    { name: STORES.uiPreferences, keyPath: ['ownerId', 'prefKey'] },
    { name: STORES.navigationState, keyPath: ['ownerId', 'stateKey'] },
    { name: STORES.userProfile, keyPath: 'userId' },
    { name: STORES.pendingSubmissions, keyPath: 'id' }
  ];
