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
    appInfo,
    style: `
        html, body, #__next {
            height: 100%;
        }
        [data-supertokens~=button] {
            background-color: #0ABDC3;
            border: 0px;
            margin: 0 auto;
            border-radius: 9999px;
            height: 48px;
        }
        [data-supertokens~=authPage] {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        [data-supertokens~=input] {
            width: 100%;
            border: 1px solid green;
        }
        
        [data-supertokens~=container] {
            --palette-background: 255, 255, 255;
            --palette-inputBackground: 255, 255, 255;
            --palette-inputBorder: 227, 227, 227;
            --palette-textTitle: 10, 189, 195;
            --palette-textLabel: 22, 28, 38;
            --palette-textPrimary: 255, 255, 255;
            --palette-error: 173, 46, 46;
            --palette-textInput: 169, 169, 169;
            --palette-textLink: 114,114,114;
            --palette-textGray: 158, 158, 158;
              width: 100%;
              height: 100vh;
        }
    `,
    recipeList: [
      SessionReact.init(),
      Passwordless.init({
        contactMethod: 'EMAIL',
        style: ``,
        onHandleEvent: event => {
          if (event.action === 'SUCCESS') {
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
