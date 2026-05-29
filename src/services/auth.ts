import { Roles } from '@/constants/roles';
import { mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { Patient, Practitioner } from 'fhir/r4';
import { SessionContextUpdate } from 'supertokens-auth-react/lib/build/recipe/session/types';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { getProfileByIdentifier } from './profile';

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
async function postAuthCookie(body: Record<string, unknown>): Promise<Response> {
  const token = await fetchCSRFToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRF-Token'] = token;
  return fetch('/auth/cookie', { method: 'POST', headers, body: JSON.stringify(body) });
}

/**
 * Restores the auth cookie when SuperTokens session is valid but auth cookie is missing
 * This function fetches user data from SuperTokens session and profile service,
 * then recreates the auth cookie using the existing cookie setting mechanism
 */
export const restoreAuthCookie = async (
  sessionContext: SessionContextUpdate
): Promise<boolean> => {
  try {
    // Check if SuperTokens session exists
    if (!sessionContext?.doesSessionExist) {
      console.log(
        'SuperTokens session does not exist, skipping auth cookie restoration'
      );
      return false;
    }

    // Get user roles and userId from SuperTokens
    let roles;
    let userId;
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

    // Determine user role with fallback
    const role =
      Array.isArray(roles) && roles.includes(Roles.Practitioner)
        ? Roles.Practitioner
        : Roles.Patient;

    // Fetch profile data from FHIR service with error handling
    let result;
    try {
      result = (await getProfileByIdentifier({
        userId,
        type: role
      })) as Patient | Practitioner;
    } catch (profileError) {
      console.error('Failed to fetch profile data:', profileError);

      // If profile fetch fails, create minimal auth payload with available data
      const authPayload = {
        userId,
        roles: Array.isArray(roles) ? roles : [role],
        role_name: role,
        email: '',
        profile_picture: '',
        fullname: '',
        fhirId: '',
        profile_complete: false
      };

      try {
        const res = await postAuthCookie(authPayload as Record<string, unknown>);
        if (!res.ok) { console.error('Failed to set auth cookie:', res.status); return false; }
        console.log('Auth cookie restored with minimal data (profile fetch failed)');
        return true;
      } catch (cookieError) {
        console.error('Failed to set auth cookie:', cookieError);
        return false;
      }
    }

    // Prepare auth payload with proper fallback values
    const email =
      result?.telecom?.find(item => item.system === 'email')?.value || '';

    const profile_complete = result ? isProfileCompleteFromFHIR(result) : false;

    const authPayload = {
      userId,
      roles: Array.isArray(roles) ? roles : [role],
      role_name: role,
      email: email || '',
      profile_picture: result?.photo?.[0]?.url ?? '',
      fullname: result?.name ? mergeNames(result?.name) : '',
      fhirId: result?.id ?? '',
      profile_complete
    };

    try {
      const res = await postAuthCookie(authPayload as Record<string, unknown>);
      if (!res.ok) { console.error('Failed to set auth cookie:', res.status); return false; }
      console.log('Auth cookie successfully restored');
      return true;
    } catch (cookieError) {
      console.error('Failed to set auth cookie:', cookieError);
      return false;
    }
  } catch (error) {
    console.error('Unexpected error restoring auth cookie:', error);
    return false;
  }
};
