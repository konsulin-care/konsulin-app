import { setCookies } from '@/app/actions';
import { createProfile, getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { useRouter } from 'next/navigation';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session from 'supertokens-auth-react/recipe/session';
import { getClaimValue } from 'supertokens-web-js/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { appInfo } from './appInfo';

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
    appInfo,
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

            if (
              context.isNewRecipeUser &&
              context.user.loginMethods.length == 1
            ) {
              // Create FHIR Profile for new user
              const profile = await createProfile({
                userId,
                email: emails[0],
                type: roles.includes('practitioner')
                  ? 'Practitioner'
                  : 'Patient'
              });

              const cookieData = {
                userId,
                role_name: roles.includes('practitioner')
                  ? 'practitioner'
                  : 'patient',
                email: emails[0],
                profile_picture: profile?.photo ? profile?.photo[0]?.url : '',
                fullname: mergeNames(profile?.name),
                fhirId: profile?.id ?? ''
              };

              await setCookies('auth', JSON.stringify(cookieData));
            } else {
              const result = await getProfileByIdentifier({
                userId,
                type: roles.includes('practitioner')
                  ? 'Practitioner'
                  : 'Patient'
              });
              const cookieData = {
                userId,
                role_name: roles.includes('practitioner')
                  ? 'practitioner'
                  : 'patient',
                email: emails[0],
                profile_picture: result?.photo ? result?.photo[0]?.url : '',
                fullname: mergeNames(result?.name, result?.qualification),
                fhirId: result?.id ?? ''
              };

              await setCookies('auth', JSON.stringify(cookieData));
            }
            routerInfo.router.refresh();
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
