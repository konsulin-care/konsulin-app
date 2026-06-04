// learn more about this on https://supertokens.com/docs/references/frontend-sdks/reference#sdk-configuration
export type AppInfo = {
  appName: string;
  apiDomain: string;
  websiteDomain: string;
  apiBasePath: string;
  websiteBasePath: string;
};

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      appInfo: AppInfo;
      terminologyServer?: string;
    };
  }
}

export function getAppInfo(): AppInfo {
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.appInfo) {
    return window.__RUNTIME_CONFIG__.appInfo;
  }
  // fallback: use origin when __RUNTIME_CONFIG__ is not set (dev mode)
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

export function getTerminologyServer(): string {
  if (typeof window !== 'undefined') {
    return window.__RUNTIME_CONFIG__?.terminologyServer ?? '';
  }
  return '';
}
