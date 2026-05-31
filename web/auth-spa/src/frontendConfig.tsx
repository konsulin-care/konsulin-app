import type { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session, { getClaimValue } from 'supertokens-auth-react/recipe/session';
import ThirdParty from 'supertokens-auth-react/recipe/thirdparty';
import { UserRoleClaim } from 'supertokens-auth-react/recipe/userroles';
import { getAppInfo } from './appInfo';
import {
  handleNewUserLogin,
  handleReturningUserLogin,
  resolvePostLoginRedirect
} from './auth-helpers';

/** SuperTokens frontend configuration. */
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

              logo: (
                <img
                  src='/icons/email.svg'
                  alt='email'
                  width={18}
                  height={18}
                />
              )
            },
            {
              id: 'whatsapp',
              name: 'WhatsApp',

              logo: (
                <img
                  src='/icons/whatsapp.png'
                  alt='whatsapp'
                  width={18}
                  height={18}
                />
              )
            }
          ]
        }
      }),
      Passwordless.init({
        contactMethod: 'EMAIL_OR_PHONE',
        onHandleEvent: async context => {
          if (context.action !== 'SUCCESS') return;

          const { id: userId, emails, phoneNumbers } = context.user;
          const roles: string[] | undefined = await getClaimValue({
            claim: UserRoleClaim
          });

          if (
            context.isNewRecipeUser &&
            context.user.loginMethods.length === 1
          ) {
            await handleNewUserLogin(roles, userId, emails, phoneNumbers);
          } else {
            await handleReturningUserLogin(roles, userId, emails, phoneNumbers);
          }

          const redirectToPath = resolvePostLoginRedirect();
          console.log('[auth:redirect] redirecting to:', redirectToPath ?? '/');
          globalThis.location.href = redirectToPath ?? '/';
        }
      })
    ]
  };
};
