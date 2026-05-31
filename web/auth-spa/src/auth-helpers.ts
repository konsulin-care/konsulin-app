import type { Patient, Practitioner } from 'fhir/r4';
import { Roles } from './constants/roles';
import { createProfile, getProfileByIdentifier } from './services/profile';
import { mergeNames } from './utils/helper';
import { extractSafeRedirectPath } from './utils/redirect-guard';
import {
  clearRedirectIntent,
  getIntent,
  getRedirectIntent
} from './utils/redirect-intent';

type FHIRProfile = Patient | Practitioner | null;

/** Posts auth cookie data to the server with CSRF protection. */
async function postAuthCookie(
  body: Record<string, unknown>
): Promise<Response> {
  let token = '';
  try {
    const res = await fetch('/auth/cookie/csrf-token');
    if (res.ok) {
      const data = (await res.json()) as { token?: string };
      token = data.token ?? '';
    }
  } catch {
    /* CSRF token fetch is best-effort */
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) headers['X-CSRF-Token'] = token;
  try {
    const res = await fetch('/auth/cookie', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return res;
  } catch (err) {
    console.error('[auth:cookie] fetch failed', err);
    return new Response(null, { status: 502 });
  }
}

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
    profile_picture: profile?.photo?.[0]?.url ?? '',
    fullname: mergeNames(profile?.name),
    fhirId: profile?.id ?? ''
  };
  try {
    const cookieRes = await postAuthCookie(cookieData);
    if (!cookieRes.ok)
      console.error('[auth:cookie] server returned', cookieRes.status);
  } catch (err) {
    console.error('[auth:cookie] failed to post auth cookie', err);
  }
}

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
  let profileData: Patient | Practitioner | null = null;
  try {
    profileData = await getProfileByIdentifier({ userId, type: role });
  } catch (err) {
    console.error('[auth:login] getProfileByIdentifier failed', err);
  }

  if (!profileData) {
    try {
      await createProfile({
        userId,
        email: emails[0] || '',
        phoneNumber: phoneNumbers[0] || '',
        type: role
      });
    } catch (err) {
      console.error('[auth:login] createProfile failed', err);
      throw new Error('Failed to create profile after login');
    }
    try {
      profileData = await getProfileByIdentifier({ userId, type: role });
    } catch (err) {
      console.error('[auth:login] re-fetch profile failed', err);
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
  let profile: Patient | Practitioner | null = null;
  try {
    profile = await getProfileByIdentifier({
      userId,
      type: role
    });
  } catch (err) {
    console.error(
      '[auth:login] getProfileByIdentifier failed for returning user',
      err
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
  if (intent) {
    clearRedirectIntent();
    return intent.payload?.path ?? '/';
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
