'use client';

import dynamic from 'next/dynamic';
import { ReactElement, useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';

const PasswordlessAuthPage = () => {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);

  useEffect(() => {
    if (!canHandleRoute([PasswordlessPreBuiltUI])) {
      redirectToAuth({ redirectBack: false });
    } else {
      setUiComponent(getRoutingComponent([PasswordlessPreBuiltUI]));
    }
  }, []);

  return uiComponent;
};

export default dynamic(() => Promise.resolve(PasswordlessAuthPage), {
  ssr: false
});
