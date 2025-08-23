export const appInfo = {
  // learn more about this on https://supertokens.com/docs/references/frontend-sdks/reference#sdk-configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Konsulin',
  apiDomain: process.env.NEXT_PUBLIC_API_URL || 'https://api.konsulin.care',
  websiteDomain: process.env.NEXT_PUBLIC_APP_URL || 'https://app.konsulin.care',
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1/auth',
  websiteBasePath: process.env.NEXT_PUBLIC_APP_AUTH_PATH || '/auth'
};
