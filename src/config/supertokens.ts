import SuperTokens from 'supertokens-auth-react';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';
import Session from 'supertokens-auth-react/recipe/session';

SuperTokens.init({
  appInfo: {
    // learn more about this on https://supertokens.com/docs/references/frontend-sdks/reference#sdk-configuration
    appName: '<YOUR_APP_NAME>',
    apiDomain: '<YOUR_API_DOMAIN>',
    websiteDomain: '<YOUR_WEBSITE_DOMAIN>',
    apiBasePath: '/auth',
    websiteBasePath: '/auth'
  },
  recipeList: [
    Passwordless.init({
      contactMethod: 'EMAIL'
    }),
    Session.init()
  ]
});
