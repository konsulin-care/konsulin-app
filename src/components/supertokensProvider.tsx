'use client';
import { frontendConfig, setRouter } from '@/config/frontendConfig';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import SuperTokensReact, { SuperTokensWrapper } from 'supertokens-auth-react';

if (typeof window !== 'undefined') {
  SuperTokensReact.init(frontendConfig());
}

export const SuperTokensProviders: React.FC<React.PropsWithChildren<{}>> = ({
  children
}) => {
  setRouter(useRouter(), usePathname() || window.location.pathname);
  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
