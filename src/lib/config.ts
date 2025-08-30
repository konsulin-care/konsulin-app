interface ServerConfig {
  APP_NAME: string;
  API_URL: string;
  API_BASE_PATH: string;
  APP_URL: string;
  APP_AUTH_PATH: string;
  TERMINOLOGY_SERVER: string;
}

export const serverConfig: ServerConfig = {
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'Konsulin',
  API_URL: process.env.API_URL ?? '',
  API_BASE_PATH: process.env.API_BASE_PATH ?? '/api/v1/auth',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  APP_AUTH_PATH: process.env.APP_AUTH_PATH ?? '/auth',
  TERMINOLOGY_SERVER: process.env.TERMINOLOGY_SERVER ?? ''
};

let cachedConfig: any = null;

export async function getClientConfig() {
  if (cachedConfig) return cachedConfig;

  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    cachedConfig = (window as any).__RUNTIME_CONFIG__;
    return cachedConfig;
  }

  // Fallback in case the env variables weren’t injected
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load client configuration');
  }

  const raw = await res.json();
  cachedConfig = {
    appInfo: {
      appName: raw.APP_NAME,
      apiDomain: raw.API_URL,
      websiteDomain: raw.APP_URL,
      apiBasePath: raw.API_BASE_PATH,
      websiteBasePath: raw.APP_AUTH_PATH
    },
    terminologyServer: raw.TERMINOLOGY_SERVER
  };

  return cachedConfig;
}
