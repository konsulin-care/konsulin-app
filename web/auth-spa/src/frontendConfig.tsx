import { Roles } from './constants/roles';
import { createProfile, getProfileByIdentifier } from './services/profile';
import { mergeNames } from './utils/helper';
import {
  clearRedirectIntent,
  getIntent,
  getRedirectIntent,
} from './utils/redirect-intent';
import { extractSafeRedirectPath } from './utils/redirect-guard';
import type { Patient, Practitioner } from 'fhir/r4';
import type { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';

async function postAuthCookie(body: Record<string, unknown>): Promise<Response> {
  let token = '';
  try {
    const res = await fetch('/auth/cookie/csrf-token');
    if (res.ok) { const d = await res.json() as { token?: string }; token = d.token ?? ''; }
  } catch {}
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRF-Token'] = token;
  return fetch('/auth/cookie', { method: 'POST', headers, body: JSON.stringify(body) });
}
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session from 'supertokens-auth-react/recipe/session';
import ThirdParty from 'supertokens-auth-react/recipe/thirdparty';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-auth-react/recipe/userroles';
import { getAppInfo } from './appInfo';

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo: getAppInfo(),
    useShadowDom: false,
    languageTranslations: {
      translations: {
        en: {
          AUTH_PAGE_HEADER_TITLE_SIGN_IN_AND_UP: 'Wellness Starts Here',
          PWLESS_SIGN_IN_UP_CONTINUE_BUTTON: 'Sign In',
        },
      },
    },
    style: `
        #supertokens-root {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        [data-supertokens~=button]:not([data-supertokens~=providerButton]) {
            background-color: #0ABDC3;
            border: 0px;
        }
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
          providers: [
            {
              id: 'email',
              name: 'Email',
              logo: <img src='/icons/email.svg' alt='email' width={18} height={18} />,
            },
            {
              id: 'whatsapp',
              name: 'WhatsApp',
              logo: <img src='/icons/whatsapp.png' alt='whatsapp' width={18} height={18} />,
            },
          ],
        },
      }),
      Passwordless.init({
        contactMethod: 'EMAIL_OR_PHONE',
        onHandleEvent: async (context) => {
          if (context.action === 'SUCCESS') {
            const { id: userId, emails, phoneNumbers } = context.user;
            const roles = await getClaimValue({ claim: UserRoleClaim }) as string[] | undefined;

            if (
              context.isNewRecipeUser &&
              context.user.loginMethods.length === 1
            ) {
              let profileData = (await getProfileByIdentifier({
                userId,
                type: Array.isArray(roles) && roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
              })) as Patient | Practitioner | null;

              if (!profileData) {
                try {
                  await createProfile({
                    userId,
                    email: emails[0] || '',
                    phoneNumber: phoneNumbers[0] || '',
                    type: Array.isArray(roles) && roles.includes(Roles.Practitioner)
                      ? Roles.Practitioner
                      : Roles.Patient,
                  });
                  profileData = (await getProfileByIdentifier({
                    userId,
                    type: Array.isArray(roles) && roles.includes(Roles.Practitioner)
                      ? Roles.Practitioner
                      : Roles.Patient,
                  })) as Patient | Practitioner | null;
                  if (!profileData) throw new Error('Failed to create profile');
                } catch (error) {
                  throw error;
                }
              }

              const cookieData = {
                userId,
                roles,
                role_name: Array.isArray(roles) && roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
                email: emails[0] || '',
                phoneNumber: phoneNumbers[0] || '',
                profile_picture: profileData?.photo?.[0]?.url ?? '',
                fullname: mergeNames(profileData?.name),
                fhirId: profileData?.id ?? '',
              };

              const cookieRes = await postAuthCookie(cookieData as Record<string, unknown>);
              if (!cookieRes.ok) {
                console.error('[auth:cookie] server returned', cookieRes.status);
                return;
              }
            } else {
              const type = Array.isArray(roles) && roles.includes(Roles.Practitioner)
                ? Roles.Practitioner
                : Roles.Patient;
              const profile = (await getProfileByIdentifier({
                userId,
                type,
              })) as Patient | Practitioner | null;

              const cookieData = {
                userId,
                roles,
                role_name: Array.isArray(roles) && roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
                email: emails[0] || '',
                phoneNumber: phoneNumbers[0] || '',
                profile_picture: profile?.photo?.[0]?.url ?? '',
                fullname: mergeNames(profile?.name),
                fhirId: profile?.id ?? '',
              };

              const cookieRes = await postAuthCookie(cookieData as Record<string, unknown>);
              if (!cookieRes.ok) {
                console.error('[auth:cookie] server returned', cookieRes.status);
                return;
              }
            }

            const redirectUrl = getRedirectIntent();
            let redirectToPath: string | null = null;

            if (redirectUrl) {
              clearRedirectIntent();
              redirectToPath = extractSafeRedirectPath(`?redirectToPath=${encodeURIComponent(redirectUrl)}`);
            } else {
              const intent = getIntent();
              if (intent) {
                clearRedirectIntent();
                redirectToPath = intent.payload?.path ?? '/';
              } else {
                redirectToPath = extractSafeRedirectPath(globalThis.location.search);
              }
            }

            if (redirectToPath) {
              console.log('[auth:redirect] redirecting to:', redirectToPath);
            } else {
              console.log('[auth:redirect] no redirect target, defaulting to /');
            }
            globalThis.location.href = redirectToPath ?? '/';
          }
        },
      }),
    ],
  };
};
