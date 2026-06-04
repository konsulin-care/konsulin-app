'use client';

import { getAppInfo } from '@/config/appInfo';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';

type AppInfo = ReturnType<typeof getAppInfo>;

type RuntimeConfig = {
  appInfo: AppInfo;
  terminologyServer: string;
};

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null);

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
      setConfig({
        appInfo: window.__RUNTIME_CONFIG__.appInfo,
        terminologyServer: window.__RUNTIME_CONFIG__.terminologyServer ?? ''
      });
      return;
    }
    fetch('/api/config')
      .then(r => r.json())
      .then(raw =>
        setConfig({
          appInfo: {
            appName: raw.APP_NAME,
            apiDomain: raw.API_URL,
            websiteDomain: raw.APP_URL,
            apiBasePath: raw.API_BASE_PATH + raw.AUTH_PATH,
            websiteBasePath: raw.AUTH_PATH
          },
          terminologyServer: raw.TX_URL ?? ''
        })
      )
      .catch(() =>
        setConfig({
          appInfo: getAppInfo(),
          terminologyServer: ''
        })
      );
  }, []);

  if (!config) return null;

  return (
    <RuntimeConfigContext.Provider value={config}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const ctx = useContext(RuntimeConfigContext);
  if (!ctx)
    throw new Error(
      'useRuntimeConfig must be inside a <RuntimeConfigProvider>'
    );
  return ctx;
}
