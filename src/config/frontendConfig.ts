import { Roles } from '@/constants/roles';
import { STORES, dbSet } from '@/lib/indexeddb';
import { createProfile, getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { extractSafeRedirectPath } from '@/utils/redirect-guard';
import {
  clearRedirectIntent,
  getIntent,
  getRedirectIntent
} from '@/utils/redirect-intent';
import { Patient, Practitioner } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import React from 'react';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session from 'supertokens-auth-react/recipe/session';
import ThirdParty from 'supertokens-auth-react/recipe/thirdparty';
import { getClaimValue } from 'supertokens-web-js/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { getAppInfo } from './appInfo';

const routerInfo: { router?: ReturnType<typeof useRouter>; pathName?: string } =
  {};

export function setRouter(
  router: ReturnType<typeof useRouter>,
  pathName: string
) {
  routerInfo.router = router;
  routerInfo.pathName = pathName;
}

/** Fetches a CSRF token from the server for use in POST /auth/cookie requests. */
async function fetchCSRFToken(): Promise<string | null> {
  try {
    const res = await fetch('/auth/cookie/csrf-token');
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Posts auth cookie data to the server with CSRF protection. */
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

async function postAuthCookieForUser(
  role: string,
  userId: string,
  roles: string[] | undefined,
  emails: string[],
  phoneNumbers: string[],
  profile: Patient | Practitioner | null
): Promise<void> {
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
  const cookieRes = await postAuthCookie(cookieData);
  if (!cookieRes.ok)
    console.error('[auth:cookie] server returned', cookieRes.status);
}

/** Handles login for new users — creates FHIR profile if missing, sets auth cookie. */
async function handleNewUserLogin(
  roles: string[] | undefined,
  userId: string,
  emails: string[],
  phoneNumbers: string[]
): Promise<void> {
  const role =
    Array.isArray(roles) && roles.includes(Roles.Practitioner)
      ? Roles.Practitioner
      : Roles.Patient;
  let profileData: Patient | Practitioner | null = await getProfileByIdentifier(
    { userId, type: role }
  );

  if (!profileData) {
    await createProfile({
      userId,
      email: emails[0] || '',
      phoneNumber: phoneNumbers[0] || '',
      type: role
    });
    profileData = await getProfileByIdentifier({ userId, type: role });
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
  const role =
    Array.isArray(roles) && roles.includes(Roles.Practitioner)
      ? Roles.Practitioner
      : Roles.Patient;
  const profile: Patient | Practitioner | null = await getProfileByIdentifier({
    userId,
    type: role
  });

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
    return (intent.payload?.path as string) ?? '/';
  }
  return extractSafeRedirectPath(globalThis.location.search);
}

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo: getAppInfo(),
    useShadowDom: false,
    languageTranslations: {
      translations: {
        en: {
          AUTH_PAGE_HEADER_TITLE_SIGN_IN_AND_UP: 'Wellness Starts Here',
          PWLESS_SIGN_IN_UP_CONTINUE_BUTTON: 'Sign In'
        }
      }
    },
    style: `
        #supertokens-root {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        /* Sign In button (primary submit) */
        [data-supertokens~=button]:not([data-supertokens~=providerButton]) {
            background-color: #0ABDC3;
            border: 0px;
        }
        /* Make the "provider" buttons (our Email / WhatsApp choices) visually distinct */
        [data-supertokens~=providerContainer] {
            padding-top: 12px;
            padding-bottom: 12px;
            --logo-size: 34px;
            --logo-horizontal-spacing: 8px;
        }
        [data-supertokens~=button][data-supertokens~=providerButton] {
            border-width: 2px !important;
            border-style: solid !important;
            border-color: #161C26 !important;
            background-color: #ffffff !important;
            min-height: 32px;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            padding: 2px calc(var(--logo-size) + 2 * var(--logo-horizontal-spacing));
            position: relative;
            color: #000;
        }
        [data-supertokens~=providerButton]:hover {
            border-color: #161C26 !important;
        }
        [data-supertokens~=providerButtonLeft] {
            width: calc(var(--logo-size));
            position: absolute;
            left: calc(var(--logo-horizontal-spacing));
        }
        [data-supertokens~=providerButtonLogo] {
            height: 30px;
            display: flex;
            align-items: center;
        }
        [data-supertokens~=providerButtonLogoCenter] {
            display: flex;
            margin: auto;
        }
        [data-supertokens~=providerButtonText] {
            font-weight: 400;
            text-align: center;
            overflow: hidden;
            white-space: nowrap;
            display: inline-block;
            flex-grow: 1;
            max-width: 100%;
            font-size: 14px;
            text-overflow: ellipsis;
        }
        [data-supertokens~=headerTitle] {
            color: #0ABDC3;
        }
        [data-supertokens~=spinnerIcon] circle {
            stroke: #0ABDC3 !important;
        }
        [data-supertokens~=sendCodeIcon] {
            display: flex;
            justify-content: center;
        }
    `,
    recipeList: [
      Session.init(),
      ThirdParty.init({
        signInAndUpFeature: {
          // We only use this to show a prebuilt "provider picker" button for WhatsApp on /auth.
          // The click behaviour is handled in the /auth page override (no OAuth flow).
          providers: [
            {
              id: 'email',
              name: 'Email',
              logo: React.createElement('img', {
                src: '/icons/email.svg',
                alt: 'email',
                width: 18,
                height: 18
              })
            },
            {
              id: 'whatsapp',
              name: 'WhatsApp',
              logo: React.createElement('img', {
                src: '/icons/whatsapp.png',
                alt: 'whatsapp',
                width: 18,
                height: 18
              })
            }
          ]
        }
      }),
      Passwordless.init({
        contactMethod: 'EMAIL_OR_PHONE',
        onHandleEvent: async context => {
          if (context.action !== 'SUCCESS') return;

          const { id: userId, emails, phoneNumbers } = context.user;
          const roles = await getClaimValue({ claim: UserRoleClaim });

          await dbSet(STORES.uiPreferences, {
            ownerId: userId ?? '',
            prefKey: 'skip-response-cleanup',
            value: 'true'
          });

          if (
            context.isNewRecipeUser &&
            context.user.loginMethods.length === 1
          ) {
            await handleNewUserLogin(roles, userId, emails, phoneNumbers);
          } else {
            await handleReturningUserLogin(roles, userId, emails, phoneNumbers);
          }

          const isAuthRoute = (routerInfo.pathName || '').startsWith('/auth');
          if (!isAuthRoute) {
            routerInfo.router.push('/auth');
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const redirectToPath = resolvePostLoginRedirect();
          console.log('[auth:redirect] redirecting to:', redirectToPath ?? '/');
          globalThis.location.href = redirectToPath ?? '/';
        }
      })
    ],
    windowHandler: original => ({
      ...original,
      location: {
        ...original.location,
        getPathName: () => routerInfo.pathName!,
        assign: url => routerInfo.router!.push(url.toString()),
        setHref: url => routerInfo.router!.push(url.toString())
      }
    })
  };
};
