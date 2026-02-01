'use client';

import { saveIntent } from '@/utils/intent-storage';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ComponentType, ReactElement, useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import MultiFactorAuth from 'supertokens-auth-react/recipe/multifactorauth';
import { PasswordlessComponentsOverrideProvider } from 'supertokens-auth-react/recipe/passwordless';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { ThirdPartyPreBuiltUI } from 'supertokens-auth-react/recipe/thirdparty/prebuiltui';
import {
  AuthPage,
  canHandleRoute,
  getRoutingComponent
} from 'supertokens-auth-react/ui';

const WHATSAPP_LINK =
  'https://wa.me/6285163181852?text=Request%20login%2C%20authenticate%20me';

/**
 * Footer with "or" separator and WhatsApp button.
 * The "or" block uses the same structure as SuperTokens prebuilt AuthPageComponentList:
 * dividerWithOr > [divider, dividerText (DIVIDER_OR), divider] so prebuilt CSS applies.
 * Button uses providerButton structure to match social login UI.
 */
const orDividerAndWhatsAppFooter = (
  <>
    <div data-supertokens='dividerWithOr'>
      <div data-supertokens='divider' />
      <div data-supertokens='dividerText'>or</div>
      <div data-supertokens='divider' />
    </div>
    <div data-supertokens='providerContainer'>
      <button
        type='button'
        data-supertokens='button providerButton providerWhatsApp'
        onClick={() =>
          window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer')
        }
      >
        <div data-supertokens='providerButtonLeft'>
          <div data-supertokens='providerButtonLogo'>
            <div data-supertokens='providerButtonLogoCenter'>
              <img
                src='/icons/whatsapp.png'
                alt='whatsapp'
                width={18}
                height={18}
              />
            </div>
          </div>
        </div>
        <div data-supertokens='providerButtonText'>
          <span>Continue with WhatsApp</span>
        </div>
      </button>
    </div>
  </>
);

const passwordlessOverrides = {
  // MFA flow with OTP_EMAIL/LINK_EMAIL uses EmailForm (email-only), not EmailOrPhoneForm.
  PasswordlessEmailForm_Override: ({
    DefaultComponent,
    ...props
  }: {
    DefaultComponent: ComponentType<Record<string, unknown>>;
    [key: string]: unknown;
  }) => <DefaultComponent {...props} footer={orDividerAndWhatsAppFooter} />
};

const PasswordlessAuthPage = () => {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const returnUrl = searchParams.get('returnUrl');
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

    // Root /auth: show passwordless email form directly with "or" + WhatsApp button in footer.
    if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
      redirectToAuth({ redirectBack: false });
      return;
    }

    setUiComponent(
      <PasswordlessComponentsOverrideProvider
        components={passwordlessOverrides}
      >
        <AuthPage
          preBuiltUIList={[ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI]}
          factors={[
            MultiFactorAuth.FactorIds.OTP_EMAIL,
            MultiFactorAuth.FactorIds.LINK_EMAIL
          ]}
        />
      </PasswordlessComponentsOverrideProvider>
    );
  }, [isRootAuth]);

  return uiComponent;
};

export default dynamic(() => Promise.resolve(PasswordlessAuthPage), {
  ssr: false
});
