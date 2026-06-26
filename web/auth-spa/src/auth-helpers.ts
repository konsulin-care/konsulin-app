import type { Patient, Person, Practitioner } from 'fhir/r4';
import { Roles } from './constants/roles';
import { createProfile, getProfileByIdentifier } from './services/profile';
import { mergeNames } from './utils/helper';
import { extractSafeRedirectPath } from './utils/redirect-guard';
import {
  clearRedirectIntent,
  getIntent,
  getRedirectIntent
} from './utils/redirect-intent';

type FHIRProfile = Patient | Practitioner | Person | null;

/** Posts auth cookie data to the server with CSRF protection. */
async function postAuthCookie(
  body: Record<string, unknown>
): Promise<Response> {
  const res = await fetch('/auth/cookie/csrf-token');
  if (!res.ok) {
    throw new Error(`CSRF token fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error('CSRF token missing from response');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': data.token
  };
  try {
    const res = await fetch('/auth/cookie', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return res;
  } catch (error) {
    console.error('[auth:cookie] fetch failed', error);
    return new Response(null, { status: 502 });
  }
}

/** POST auth cookie data to the backend for a user/role combo. */
async function postAuthCookieForUser(
  role: string,
  userId: string,
  roles: string[] | undefined,
  emails: string[],
  phoneNumbers: string[],
  profile: FHIRProfile
): Promise<void> {
  if (!role || !userId) {
    console.error('[auth:cookie] missing required params', { role, userId });
    throw new Error('Missing required auth cookie parameters');
  }
  const cookieData = {
    userId,
    roles,
    role_name: role,
    email: emails[0] || '',
    phoneNumber: phoneNumbers[0] || '',
    profile_picture: Array.isArray(profile?.photo)
      ? (profile?.photo?.[0]?.url ?? '')
      : (profile?.photo?.url ?? ''),
    fullname: mergeNames(profile?.name),
    fhirId: profile?.id ?? ''
  };
  const cookieRes = await postAuthCookie(cookieData);
  if (!cookieRes.ok) {
    const body = await cookieRes.text().catch(() => '');
    throw new Error(`auth cookie server error: ${cookieRes.status} ${body}`);
  }
}

/** Handle first-time login: resolve role, fetch profile, set cookie. */
async function handleNewUserLogin(
  roles: string[] | undefined,
  userId: string,
  emails: string[],
  phoneNumbers: string[]
): Promise<void> {
  if (!userId) {
    console.error('[auth:login] missing userId');
    throw new Error('Missing userId for new user login');
  }
  const role =
    Array.isArray(roles) && roles.includes(Roles.Practitioner)
      ? Roles.Practitioner
      : Roles.Patient;
  let profileData: FHIRProfile = null;
  try {
    profileData = await getProfileByIdentifier({ userId, type: role });
  } catch (error) {
    console.error('[auth:login] getProfileByIdentifier failed', error);
  }

  if (!profileData) {
    try {
      await createProfile({
        userId,
        email: emails[0] || '',
        phoneNumber: phoneNumbers[0] || '',
        type: role
      });
    } catch (error) {
      console.error('[auth:login] createProfile failed', error);
      throw new Error('Failed to create profile after login');
    }
    try {
      profileData = await getProfileByIdentifier({ userId, type: role });
    } catch (error) {
      console.error('[auth:login] re-fetch profile failed', error);
    }
    if (!profileData) throw new Error('Failed to create profile');
  }

  await postAuthCookieForUser(
    role,
    userId,
    roles,
    emails,
    phoneNumbers,
    profileData
  );
}

/** Handles login for returning users — fetches FHIR profile and sets auth cookie. */
async function handleReturningUserLogin(
  roles: string[] | undefined,
  userId: string,
  emails: string[],
  phoneNumbers: string[]
): Promise<void> {
  if (!userId) {
    console.error('[auth:login] missing userId for returning user');
    throw new Error('Missing userId for returning user login');
  }
  const role =
    Array.isArray(roles) && roles.includes(Roles.Practitioner)
      ? Roles.Practitioner
      : Roles.Patient;
  let profile: FHIRProfile = null;
  try {
    profile = await getProfileByIdentifier({
      userId,
      type: role
    });
  } catch (error) {
    console.error(
      '[auth:login] getProfileByIdentifier failed for returning user',
      error
    );
  }

  await postAuthCookieForUser(
    role,
    userId,
    roles,
    emails,
    phoneNumbers,
    profile
  );
}

/** Resolves post-login redirect URL from stored intent or query params. */
function resolvePostLoginRedirect(): string | null {
  const redirectUrl = getRedirectIntent();
  if (redirectUrl) {
    clearRedirectIntent();
    return extractSafeRedirectPath(
      `?redirectToPath=${encodeURIComponent(redirectUrl)}`
    );
  }
  const intent = getIntent();
  if (
    intent?.payload &&
    typeof intent.payload === 'object' &&
    'path' in intent.payload
  ) {
    clearRedirectIntent();
    const path = (intent.payload as { path?: unknown }).path;
    if (typeof path === 'string') {
      return (
        extractSafeRedirectPath(
          `?redirectToPath=${encodeURIComponent(path)}`
        ) ?? '/'
      );
    }
    return '/';
  }
  return extractSafeRedirectPath(globalThis.location.search);
}

export {
  handleNewUserLogin,
  handleReturningUserLogin,
  postAuthCookie,
  postAuthCookieForUser,
  resolvePostLoginRedirect
};
