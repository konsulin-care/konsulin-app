// learn more about this on https://supertokens.com/docs/references/frontend-sdks/reference#sdk-configuration
export type AppInfo = {
  appName: string;
  apiDomain: string;
  websiteDomain: string;
  apiBasePath: string;
  websiteBasePath: string;
};

export function getAppInfo(): AppInfo {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';
  return {
    appName: 'Konsulin',
    apiDomain: origin,
    websiteDomain: origin,
    apiBasePath: '/api/v1/auth',
    websiteBasePath: '/auth'
  };
}
