'use client';

import { saveIntent } from '@/utils/intent-storage';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ReactElement, useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';

const PasswordlessAuthPage = () => {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      if (returnUrl.startsWith('/journal')) {
        saveIntent('journal', { path: returnUrl });
      } else if (
        returnUrl.startsWith('/assessments') ||
        returnUrl.startsWith('/record')
      ) {
        // Just in case middleware intercepts these too, we can save generic redirect or handle specific intent
        // For now, only journal is explicitly requested to be fixed via middleware interception
      }
    }
  }, [searchParams]);

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
