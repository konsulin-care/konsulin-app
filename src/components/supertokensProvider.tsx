'use client';
import { RuntimeConfigContext } from '@/components/general/runtime-config-provider';
import { frontendConfig, setRouter } from '@/config/frontendConfig';
import { usePathname, useRouter } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';
import SuperTokensReact, { SuperTokensWrapper } from 'supertokens-auth-react';

export const SuperTokensProviders: React.FC<
  React.PropsWithChildren<object>
> = ({ children }) => {
  const runtimeConfig = useContext(RuntimeConfigContext);
  const [initDone, setInitDone] = useState(false);
  setRouter(useRouter(), usePathname() || window.location.pathname);

  useEffect(() => {
    if (runtimeConfig && !initDone) {
      SuperTokensReact.init(frontendConfig(runtimeConfig.appInfo));
      setInitDone(true);
    }
  }, [runtimeConfig, initDone]);

  if (!initDone) return null;

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
