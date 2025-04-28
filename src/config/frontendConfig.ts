import { useRouter } from 'next/navigation';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import SessionReact from 'supertokens-auth-react/recipe/session';
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
    enableDebugLogs: false,
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
    `,
    recipeList: [
      Passwordless.init({
        contactMethod: 'EMAIL',
        onHandleEvent: context => {
          console.log('only context', context);
          if (context.action === 'PASSWORDLESS_RESTART_FLOW') {
            // TODO:

            console.log('restart', context);
          } else if (context.action === 'PASSWORDLESS_CODE_SENT') {
            // TODO:
            console.log('sent', context);
          } else {
            let { id } = context.user;
            if (context.action === 'SUCCESS') {
              console.log('success', context);
              if (
                context.isNewRecipeUser &&
                context.user.loginMethods.length === 1
              ) {
                // TODO: Sign up

                console.log('success sign up', context);
              } else {
                console.log('success sign in', context);
                // TODO: Sign in
              }
            }
          }
        }
      }),
      SessionReact.init()
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
