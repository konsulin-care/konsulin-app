'use client';
import { RuntimeConfigContext } from '@/components/general/runtime-config-provider';
import { frontendConfig, setRouter } from '@/config/frontendConfig';
import { usePathname, useRouter } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';
import SuperTokensReact, { SuperTokensWrapper } from 'supertokens-auth-react';

/** SuperTokens auth provider wrapper initialized from runtime config. */
export const SuperTokensProviders: React.FC<
  React.PropsWithChildren<object>
> = ({ children }) => {
  const runtimeConfig = useContext(RuntimeConfigContext);
  const [initDone, setInitDone] = useState(false);
  const prevConfigRef = useRef('');
  setRouter(useRouter(), usePathname() || window.location.pathname);

  useEffect(() => {
    if (!runtimeConfig) return;

    const configStr = JSON.stringify(runtimeConfig.appInfo);
    if (prevConfigRef.current === configStr) return;
    prevConfigRef.current = configStr;

    SuperTokensReact.init(frontendConfig(runtimeConfig.appInfo));
    setInitDone(true);
  }, [runtimeConfig]);

  if (!initDone) return null;

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
