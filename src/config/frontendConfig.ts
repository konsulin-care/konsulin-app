import { useRouter } from 'next/navigation';
import { SuperTokensConfig } from 'supertokens-auth-react/lib/build/types';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import SessionReact from 'supertokens-auth-react/recipe/session';
import { appInfo } from './appinfo';

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
        [data-supertokens~=button] {
            background-color: #0ABDC3;
            border: 0px;
            margin: 0 auto;
        }
        [data-supertokens~=authPage] {
          
        }
        [data-supertokens~=container] {
            --palette-background: 236, 239, 244;
            --palette-inputBackground: 236, 239, 244;
            --palette-inputBorder: 41, 41, 41;
            --palette-textTitle: 22, 28, 38;
            --palette-textLabel: 22, 28, 38;
            --palette-textPrimary: 255, 255, 255;
            --palette-error: 173, 46, 46;
            --palette-textInput: 169, 169, 169;
            --palette-textLink: 114,114,114;
            --palette-textGray: 158, 158, 158;
        }
    `,
    recipeList: [
      SessionReact.init(),
      Passwordless.init({
        contactMethod: 'EMAIL'
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
