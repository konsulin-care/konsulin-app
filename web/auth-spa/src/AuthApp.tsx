import type { ReactElement } from 'react';
import { createElement, useEffect, useState } from 'react';
import { redirectToAuth } from 'supertokens-auth-react';
import type { ComponentOverrideMap } from 'supertokens-auth-react/lib/build/recipe/passwordless/types';
import MultiFactorAuth from 'supertokens-auth-react/recipe/multifactorauth';
import { PasswordlessComponentsOverrideProvider } from 'supertokens-auth-react/recipe/passwordless';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';
import { ThirdPartyPreBuiltUI } from 'supertokens-auth-react/recipe/thirdparty/prebuiltui';
import {
  AuthPage,
  canHandleRoute,
  getRoutingComponent
} from 'supertokens-auth-react/ui';
import { saveIntent } from './utils/redirect-intent';

const WHATSAPP_LINK =
  'https://wa.me/6285163181852?text=Request%20login%2C%20authenticate%20me';

/**
 * Validate that a redirect path is a safe relative URL.
 * Only allows paths starting with / and containing safe characters.
 */
function sanitizePath(path: string | null): string | null {
  if (!path || typeof path !== 'string') return null;
  if (!/^\/[a-zA-Z0-9\-_.~/]+$/.test(path)) return null;
  return path;
}

/* eslint-disable react/jsx-max-depth */
// NOSONAR - deep nesting required by SuperTokens provider button spec
// skipcq: JS-0415 - SuperTokens DOM spec requires this nesting depth
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

const passwordlessOverrides: Partial<ComponentOverrideMap> = {
  PasswordlessEmailForm_Override: props => {
    const { DefaultComponent, ...rest } = props;
    return <DefaultComponent {...rest} footer={orDividerAndWhatsAppFooter} />;
  }
};

/** Main authentication application component. */
export default function AuthApp() {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams = new URLSearchParams(globalThis.location.search);
  const pathname = globalThis.location.pathname.replace(/\/$/, '');
  const redirectToPath = searchParams.get('redirectToPath');
  const isRootAuth = pathname === '/auth';

  useEffect(() => {
    const safePath = sanitizePath(redirectToPath);
    if (safePath) {
      if (safePath.startsWith('/journal')) {
        saveIntent('journal', { path: safePath });
      }
      if (safePath.startsWith('/record')) {
        const intent = {
          kind: 'assessmentResult' as const,
          payload: { path: safePath },
          createdAt: Date.now()
        };
        try {
          localStorage.setItem('konsulin.intent', JSON.stringify(intent));
        } catch {
          /* ignore */
        }
        saveIntent('assessmentResult', { path: safePath });
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
        getRoutingComponent([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])
      );
      return;
    }

    if (!canHandleRoute([ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI])) {
      redirectToAuth({ redirectBack: false });
      return;
    }

    setUiComponent(
      createElement(
        PasswordlessComponentsOverrideProvider,
        { components: passwordlessOverrides },
        createElement(AuthPage, {
          preBuiltUIList: [ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI],
          factors: [
            MultiFactorAuth.FactorIds.OTP_EMAIL,
            MultiFactorAuth.FactorIds.LINK_EMAIL
          ]
        })
      )
    );
  }, [isRootAuth]);

  return uiComponent;
}
