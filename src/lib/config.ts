interface ServerConfig {
  APP_NAME: string;
  API_URL: string;
  API_BASE_PATH: string;
  AUTH_PATH: string;
  APP_URL: string;
  TX_URL: string;
}

export const serverConfig: ServerConfig = {
  APP_NAME: process.env.APP_NAME ?? 'Konsulin',
  API_URL: process.env.API_URL ?? '',
  API_BASE_PATH: process.env.API_BASE_PATH ?? '/api/v1',
  AUTH_PATH: process.env.AUTH_PATH ?? '/auth',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  TX_URL: process.env.TX_URL ?? ''
};

let cachedConfig: any = null;

export async function getClientConfig() {
  if (cachedConfig) return cachedConfig;

  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    cachedConfig = (window as any).__RUNTIME_CONFIG__;
    return cachedConfig;
  }

  // Fallback in case the env variables weren't injected
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
      apiBasePath: raw.API_BASE_PATH + raw.AUTH_PATH,
      websiteBasePath: raw.AUTH_PATH
    },
    terminologyServer: raw.TX_URL
  };

  return cachedConfig;
}
