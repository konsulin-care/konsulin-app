'use client';

import { saveIntent } from '@/utils/intent-storage';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactElement, useEffect, useMemo, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import MultiFactorAuth from 'supertokens-auth-react/recipe/multifactorauth';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { ThirdpartyComponentsOverrideProvider } from 'supertokens-auth-react/recipe/thirdparty';
import { ThirdPartyPreBuiltUI } from 'supertokens-auth-react/recipe/thirdparty/prebuiltui';
import {
  AuthPage,
  canHandleRoute,
  getRoutingComponent
} from 'supertokens-auth-react/ui';

const ThirdPartyProvidersFormOverride = (props: any) => {
  const whatsappLink =
    'https://wa.me/6285163181852?text=Request%20login%2C%20authenticate%20me';

  const { providers } = props;

  return (
    <>
      {providers.map((provider: any) => (
        <div
          key={`provider-${provider.id}`}
          data-supertokens='providerContainer'
        >
          <span
            onClick={() => {
              if (provider.id === 'whatsapp') {
                window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                return;
              }

              if (provider.id === 'email') {
                const params = new URLSearchParams(window.location.search);
                params.set('method', 'email');
                window.location.assign(`/auth?${params.toString()}`);
              }
            }}
          >
            {provider.getButton()}
          </span>
        </div>
      ))}
    </>
  );
};

const PasswordlessAuthPage = () => {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const returnUrl = searchParams.get('returnUrl');
  const method = searchParams.get('method');
  const thirdPartyComponents = useMemo(
    () => ({
      ThirdPartySignInAndUpProvidersForm_Override:
        ThirdPartyProvidersFormOverride
    }),
    []
  );
  const isRootAuth = pathname === '/auth';

  useEffect(() => {
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
  }, [returnUrl]);

  useEffect(() => {
    // For Supertokens sub-routes like /auth/verify, /auth/callback/*, etc,
    // we must let Supertokens handle routing so magic links / callbacks work.
    if (!isRootAuth) {
      if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
        redirectToAuth({ redirectBack: false });
        return;
      }

      setUiComponent(
        getRoutingComponent([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])
      );
      return;
    }

    // Root /auth: show the provider picker by default, or passwordless UI if user selected Email.
    if (method === 'email') {
      // Important: ThirdParty is initialised in the app, so we must keep it in the preBuiltUIList.
      // We just force the factor list to passwordless-email so it renders the passwordless email UI.
      if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
        redirectToAuth({ redirectBack: false });
        return;
      }

      setUiComponent(
        <ThirdpartyComponentsOverrideProvider components={thirdPartyComponents}>
          <AuthPage
            preBuiltUIList={[ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI]}
            factors={[
              // Passwordless email factors (OTP and/or magic link).
              // Including both keeps it compatible with whichever flow is enabled.
              MultiFactorAuth.FactorIds.OTP_EMAIL,
              MultiFactorAuth.FactorIds.LINK_EMAIL
            ]}
          />
        </ThirdpartyComponentsOverrideProvider>
      );
      return;
    }

    if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
      redirectToAuth({ redirectBack: false });
    } else {
      setUiComponent(
        <ThirdpartyComponentsOverrideProvider components={thirdPartyComponents}>
          <AuthPage
            // Use Supertokens' prebuilt AuthPage (method picker).
            // Start on the "social / providers" screen, and let users click the built-in
            // "Continue with Email" (passwordless) button to switch into the passwordless flow.
            preBuiltUIList={[ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI]}
            factors={[MultiFactorAuth.FactorIds.THIRDPARTY]}
          />
        </ThirdpartyComponentsOverrideProvider>
      );
    }
  }, [isRootAuth, method, thirdPartyComponents]);

  return uiComponent;
};

export default dynamic(() => Promise.resolve(PasswordlessAuthPage), {
  ssr: false
});
