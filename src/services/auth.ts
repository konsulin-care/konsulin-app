import { Roles } from '@/constants/roles';
import { mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { Patient, Practitioner } from 'fhir/r4';
import { SessionContextUpdate } from 'supertokens-auth-react/lib/build/recipe/session/types';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { getProfileByIdentifier } from './profile';

export interface AuthCookieSession {
  authenticated: boolean;
  userId?: string;
  role_name?: string;
  roles?: string[];
  fhirId?: string;
  profile_picture?: string;
  fullname?: string;
  email?: string;
  profile_complete?: boolean;
}

/**
 * Reads the current auth cookie session from the Go BFF.
 * Returns the session data or null if the request fails.
 */
export async function getAuthCookieSession(): Promise<AuthCookieSession | null> {
  try {
    const res = await fetch('/auth/cookie');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch auth cookie session:', err);
    return null;
  }
}

/**
 * Fetches CSRF token from the server for use in POST /auth/cookie requests.
 * Returns the token string or null if the endpoint is unavailable.
 */
export async function fetchCSRFToken(): Promise<string | null> {
  try {
    const res = await fetch('/auth/cookie/csrf-token');
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Posts auth cookie data to the server. */
async function postAuthCookie(
  body: Record<string, unknown>
): Promise<Response> {
  const token = await fetchCSRFToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) headers['X-CSRF-Token'] = token;
  return fetch('/auth/cookie', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

async function postAuthCookieWithLogging(
  authPayload: Record<string, unknown>,
  logMessage: string
): Promise<boolean> {
  try {
    const res = await postAuthCookie(authPayload);
    if (!res.ok) {
      console.error('Failed to set auth cookie:', res.status);
      return false;
    }
    console.log(logMessage);
    return true;
  } catch (cookieError) {
    console.error('Failed to set auth cookie:', cookieError);
    return false;
  }
}

function buildAuthPayload(
  userId: string,
  roles: string[] | undefined,
  role: string,
  profile: Patient | Practitioner | null
): Record<string, unknown> {
  const email =
    profile?.telecom?.find(item => item.system === 'email')?.value || '';
  const profile_complete = profile ? isProfileCompleteFromFHIR(profile) : false;

  return {
    userId,
    roles: Array.isArray(roles) ? roles : [role],
    role_name: role,
    email: email || '',
    profile_picture: profile?.photo?.[0]?.url ?? '',
    fullname: profile?.name ? mergeNames(profile?.name) : '',
    fhirId: profile?.id ?? '',
    profile_complete
  };
}

async function attemptProfileFetch(
  userId: string,
  role: string
): Promise<Patient | Practitioner | null> {
  try {
    return await getProfileByIdentifier({ userId, type: role });
  } catch (profileError) {
    console.error('Failed to fetch profile data:', profileError);
    return null;
  }
}

/** Resolve the highest-priority role from SuperTokens role claims. */
function resolveRole(roles: string[] | undefined): string {
  if (Array.isArray(roles)) {
    if (roles.includes(Roles.Practitioner)) return Roles.Practitioner;
    if (roles.includes(Roles.ClinicAdmin)) return Roles.ClinicAdmin;
  }
  return Roles.Patient;
}

/**
 * Restores the auth cookie when SuperTokens session is valid but auth cookie is missing.
 * Skips if the cookie already exists with a valid role_name (idempotent).
 */
export const restoreAuthCookie = async (
  sessionContext: SessionContextUpdate
): Promise<boolean> => {
  if (!sessionContext?.doesSessionExist) {
    console.log(
      'SuperTokens session does not exist, skipping auth cookie restoration'
    );
    return false;
  }

  // If auth cookie already has a valid role, skip restore.
  const existing = await getAuthCookieSession();
  if (existing?.authenticated && existing?.role_name) {
    return true;
  }

  let roles: string[] | undefined;
  let userId: string;
  try {
    roles = await getClaimValue({ claim: UserRoleClaim });
    userId = sessionContext.userId;
  } catch (claimError) {
    console.error('Failed to get user claims from SuperTokens:', claimError);
    return false;
  }

  if (!userId) {
    console.error('User ID not found in SuperTokens session');
    return false;
  }

  const role = resolveRole(roles);

  const profile = await attemptProfileFetch(userId, role);
  const authPayload = buildAuthPayload(userId, roles, role, profile);

  const logMessage = profile
    ? 'Auth cookie successfully restored'
    : 'Auth cookie restored with minimal data (profile fetch failed)';

  return postAuthCookieWithLogging(authPayload, logMessage);
};
