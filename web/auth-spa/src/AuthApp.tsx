import { saveIntent } from './utils/redirect-intent';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import MultiFactorAuth from 'supertokens-auth-react/recipe/multifactorauth';
import { PasswordlessComponentsOverrideProvider } from 'supertokens-auth-react/recipe/passwordless';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { ThirdPartyPreBuiltUI } from 'supertokens-auth-react/recipe/thirdparty/prebuiltui';
import {
  AuthPage,
  canHandleRoute,
  getRoutingComponent,
} from 'supertokens-auth-react/ui';

const WHATSAPP_LINK =
  'https://wa.me/6285163181852?text=Request%20login%2C%20authenticate%20me';

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

const passwordlessOverrides: Record<string, any> = {
  PasswordlessEmailForm_Override: (props: any) => {
    const { DefaultComponent, ...rest } = props;
    return <DefaultComponent {...rest} footer={orDividerAndWhatsAppFooter} />;
  },
};

export default function AuthApp() {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const redirectToPath = searchParams.get('redirectToPath');
  const isRootAuth = pathname === '/auth';

  useEffect(() => {
    if (redirectToPath) {
      if (redirectToPath.startsWith('/journal')) {
        saveIntent('journal', { path: redirectToPath });
      }
    }
  }, [redirectToPath]);

  useEffect(() => {
    if (!isRootAuth) {
      if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
        redirectToAuth({ redirectBack: false });
        return;
      }
      setUiComponent(
        getRoutingComponent([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI]),
      );
      return;
    }

    if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
      redirectToAuth({ redirectBack: false });
      return;
    }

    setUiComponent(
      <PasswordlessComponentsOverrideProvider components={passwordlessOverrides}>
        <AuthPage
          preBuiltUIList={[ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI]}
          factors={[
            MultiFactorAuth.FactorIds.OTP_EMAIL,
            MultiFactorAuth.FactorIds.LINK_EMAIL,
          ]}
        />
      </PasswordlessComponentsOverrideProvider>,
    );
  }, [isRootAuth]);

  return uiComponent;
}
