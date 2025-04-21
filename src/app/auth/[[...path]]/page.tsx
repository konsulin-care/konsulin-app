'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';

const PasswordlessAuthPage = () => {
  const [uiComponent, setUiComponent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    if (!canHandleRoute([PasswordlessPreBuiltUI])) {
      redirectToAuth();
    } else {
      setUiComponent(getRoutingComponent([PasswordlessPreBuiltUI]));
    }
  }, []);

  return uiComponent;
};

export default dynamic(() => Promise.resolve(PasswordlessAuthPage), {
  ssr: false
});
