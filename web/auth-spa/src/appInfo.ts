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

/** Returns the app info from runtime config or defaults. */
export function getAppInfo(): AppInfo {
  if (globalThis.__RUNTIME_CONFIG__?.appInfo) {
    return globalThis.__RUNTIME_CONFIG__.appInfo;
  }
  return {
    appName: 'Konsulin',
    apiDomain: 'http://localhost:3200',
    websiteDomain: 'http://localhost:3000',
    apiBasePath: '/api/v1/auth',
    websiteBasePath: '/auth'
  };
}
