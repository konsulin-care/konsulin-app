import { setCookies } from '@/app/actions';
import { Roles } from '@/constants/roles';
import { createProfile, getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { Patient, Practitioner } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session from 'supertokens-auth-react/recipe/session';
import { getClaimValue } from 'supertokens-web-js/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { getAppInfo } from './appInfo';

/* -------------------------------------------------------------------------- */
/* Router holder                                                               */
/* -------------------------------------------------------------------------- */
const routerInfo: { router?: ReturnType<typeof useRouter>; pathName?: string } =
  {};

export function setRouter(
  router: ReturnType<typeof useRouter>,
  pathName: string
) {
  routerInfo.router = router;
  routerInfo.pathName = pathName;
}

/* -------------------------------------------------------------------------- */
/* Profile completeness helper (Issue #272)                                    */
/* -------------------------------------------------------------------------- */
const isProfileComplete = (
  profile?: Patient | Practitioner,
  email?: string
) => {
  const hasFullName = !!mergeNames(profile?.name);
  const hasDOB = !!profile?.birthDate;
  const hasEmail = !!email;

  const hasWhatsapp = profile?.telecom?.some(
    t => t.system === 'phone' && t.use === 'mobile' && !!t.value
  );

  return hasFullName && hasDOB && hasEmail && hasWhatsapp;
};

/* -------------------------------------------------------------------------- */
/* SuperTokens frontend config                                                 */
/* -------------------------------------------------------------------------- */
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
      Passwordless.init({
        contactMethod: 'EMAIL',
        onHandleEvent: async context => {
          if (context.action === 'SUCCESS') {
            const { id: userId, emails } = context.user;
            const roles = await getClaimValue({ claim: UserRoleClaim });

            localStorage.setItem('skip-response-cleanup', 'true');

            const role = roles.includes(Roles.Practitioner)
              ? Roles.Practitioner
              : Roles.Patient;

            /* ------------------------ New user flow ------------------------ */
            if (
              context.isNewRecipeUser &&
              context.user.loginMethods.length === 1
            ) {
              let profileData = (await getProfileByIdentifier({
                userId,
                type: role
              })) as Patient | Practitioner;

              if (!profileData) {
                await createProfile({
                  userId,
                  email: emails[0],
                  type: role
                });

                profileData = (await getProfileByIdentifier({
                  userId,
                  type: role
                })) as Patient | Practitioner;

                if (!profileData) {
                  throw new Error('Failed to create profile');
                }
              }

              const cookieData = {
                userId,
                role_name: role,
                email: emails[0],
                profile_picture: profileData?.photo
                  ? profileData.photo[0]?.url
                  : '',
                fullname: mergeNames(profileData?.name),
                fhirId: profileData?.id ?? '',
                profileComplete: isProfileComplete(profileData, emails[0])
              };

              await setCookies('auth', JSON.stringify(cookieData));
            } else {
              /* --------------------- Existing user flow --------------------- */
              const profile = (await getProfileByIdentifier({
                userId,
                type: role
              })) as Patient | Practitioner;

              const cookieData = {
                userId,
                role_name: role,
                email: emails[0],
                profile_picture: profile?.photo ? profile.photo[0]?.url : '',
                fullname: mergeNames(profile?.name),
                fhirId: profile?.id ?? '',
                profileComplete: isProfileComplete(profile, emails[0])
              };

              await setCookies('auth', JSON.stringify(cookieData));
            }

            /* ------------------------ Redirect logic ------------------------ */
            const isAuthRoute = (routerInfo.pathName || '').startsWith('/auth');

            if (!isAuthRoute) {
              routerInfo.router?.push('/auth');
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
