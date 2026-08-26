'use client';

import { getIntent, saveIntent } from '@/utils/redirect-intent';
import Image from 'next/image';
import { createElement, useEffect, useState, type ReactElement } from 'react';
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

const WHATSAPP_LINK =
  'https://wa.me/6285163181852?text=Request%20login%2C%20authenticate%20me';

const whatsappLogo = (
  <div data-supertokens='providerButtonLogo'>
    <div data-supertokens='providerButtonLogoCenter'>
      <Image src='/icons/whatsapp.png' alt='whatsapp' width={18} height={18} />
    </div>
  </div>
);

const whatsappButton = (
  <button
    type='button'
    data-supertokens='button providerButton providerWhatsApp'
    onClick={() => window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer')}
  >
    <div data-supertokens='providerButtonLeft'>{whatsappLogo}</div>
    <div data-supertokens='providerButtonText'>
      <span>Continue with WhatsApp</span>
    </div>
  </button>
);

const orDivider = (
  <div data-supertokens='dividerWithOr'>
    <div data-supertokens='divider' />
    <div data-supertokens='dividerText'>or</div>
    <div data-supertokens='divider' />
  </div>
);

const orDividerAndWhatsAppFooter = (
  <>
    {orDivider}
    <div data-supertokens='providerContainer'>{whatsappButton}</div>
  </>
);

const passwordlessOverrides: Partial<ComponentOverrideMap> = {
  PasswordlessEmailForm_Override: props => {
    const { DefaultComponent, ...rest } = props;
    return <DefaultComponent {...rest} footer={orDividerAndWhatsAppFooter} />;
  }
};

/** Returns the path only when it is a safe single-segment URL path. */
function sanitizePath(path: string | null): string | null {
  if (!path || typeof path !== 'string') return null;
  if (!/^\/[a-zA-Z0-9\-_.~/]+$/.test(path)) return null;
  return path;
}

/** Auth login page — renders SuperTokens Email OTP + WhatsApp login. */
export default function AuthPageComponent() {
  const [uiComponent, setUiComponent] = useState<ReactElement | null>(null);
  const searchParams =
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const pathname =
    typeof window === 'undefined'
      ? '/auth'
      : window.location.pathname.replace(/\/$/, '');
  const redirectToPath = searchParams.get('redirectToPath');
  const isRootAuth = pathname === '/auth';

  useEffect(() => {
    const safePath = sanitizePath(redirectToPath);
    if (!safePath) return;
    let kind: 'journal' | 'assessmentResult' | null = null;
    if (safePath.startsWith('/journal')) kind = 'journal';
    else if (safePath.startsWith('/record')) kind = 'assessmentResult';
    if (!kind) return;
    // Preserve an existing same-kind intent — it may carry a richer
    // payload such as qrId set by the /result claim flow.
    const existing = getIntent();
    if (existing?.kind === kind) return;
    saveIntent(kind, { path: safePath });
  }, [redirectToPath]);

  useEffect(() => {
    const preBuiltUIList = [ThirdPartyPreBuiltUI, PasswordlessPreBuiltUI];

    if (!canHandleRoute(preBuiltUIList)) {
      // skipcq: JS-0098 - redirect is fire-and-forget navigation
      void redirectToAuth({ redirectBack: false });
      return;
    }

    if (!isRootAuth) {
      // @type {supertokens-auth-react} returns a poorly-typed ReactElement in React 19
      setUiComponent(getRoutingComponent(preBuiltUIList) as ReactElement);
      return;
    }

    setUiComponent(
      createElement(
        PasswordlessComponentsOverrideProvider,
        { components: passwordlessOverrides },
        createElement(AuthPage, {
          preBuiltUIList,
          factors: [
            MultiFactorAuth.FactorIds.OTP_EMAIL,
            MultiFactorAuth.FactorIds.LINK_EMAIL
          ]
        })
      )
    );
  }, [isRootAuth]);

  return <div id='supertokens-root'>{uiComponent}</div>;
}
