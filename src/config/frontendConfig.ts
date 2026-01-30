import { setCookies } from '@/app/actions';
import { Roles } from '@/constants/roles';
import { createProfile, getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
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

export const frontendConfig = (): SuperTokensConfig => {
  return {
    appInfo: getAppInfo(),
    useShadowDom: false,
    style: `
        #supertokens-root {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        [data-supertokens~=button] {
            background-color: #0ABDC3;
            border: 0px;
        }
        /* Make the "provider" buttons (our Email / WhatsApp choices) visually distinct */
        [data-supertokens~=providerContainer] {
            padding-top: 12px;
            padding-bottom: 12px;
        }
        [data-supertokens~=providerButton] {
            border-width: 2px !important;
            border-style: solid !important;
            border-color: rgba(19, 194, 194, 0.55) !important;
            background-color: #ffffff !important;
        }
        [data-supertokens~=providerButton]:hover {
            border-color: rgba(19, 194, 194, 0.9) !important;
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
          if (context.action === 'SUCCESS') {
            const { id: userId, emails, phoneNumbers } = context.user;
            const roles = await getClaimValue({ claim: UserRoleClaim });
            localStorage.setItem('skip-response-cleanup', 'true');

            if (
              context.isNewRecipeUser &&
              context.user.loginMethods.length == 1
            ) {
              // depend on getProfileByIdentifier to fill
              // the profile data instead of response from
              // creating profile
              let profileData = (await getProfileByIdentifier({
                userId,
                type: roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient
              })) as Patient | Practitioner;

              if (!profileData) {
                try {
                  // Create FHIR Profile for new user
                  await createProfile({
                    userId,
                    email: emails[0] || '',
                    phoneNumber: phoneNumbers[0] || '',
                    type: roles.includes(Roles.Practitioner)
                      ? Roles.Practitioner
                      : Roles.Patient
                  });

                  // re-fetch the profile data
                  profileData = (await getProfileByIdentifier({
                    userId,
                    type: roles.includes(Roles.Practitioner)
                      ? Roles.Practitioner
                      : Roles.Patient
                  })) as Patient | Practitioner;

                  if (!profileData) throw new Error('Failed to create profile');
                } catch (error) {
                  throw error;
                }
              }

              const cookieData = {
                userId,
                role_name: roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
                email: emails[0] || '',
                phoneNumber: phoneNumbers[0] || '',
                profile_picture: profileData?.photo
                  ? profileData?.photo[0]?.url
                  : '',
                fullname: mergeNames(profileData?.name),
                fhirId: profileData?.id ?? ''
              };

              await setCookies('auth', JSON.stringify(cookieData));
            } else {
              const type = roles.includes(Roles.Practitioner)
                ? Roles.Practitioner
                : Roles.Patient;
              let profile = (await getProfileByIdentifier({
                userId,
                type
              })) as Patient | Practitioner;

              // Do not auto-create profile on lookup miss; leave fhirId empty

              const cookieData = {
                userId,
                role_name: roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
                email: emails[0] || '',
                phoneNumber: phoneNumbers[0] || '',
                profile_picture: profile?.photo ? profile?.photo[0]?.url : '',
                fullname: mergeNames(profile?.name),
                fhirId: profile?.id ?? ''
              };

              await setCookies('auth', JSON.stringify(cookieData));
            }

            const isAuthRoute = (routerInfo.pathName || '').startsWith('/auth');
            if (!isAuthRoute) {
              routerInfo.router.push('/auth');
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            window.location.href = '/';
          }
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
