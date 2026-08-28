'use client';

import QueryProvider from '@/components/general/query-provider';
import { RuntimeConfigProvider } from '@/components/general/runtime-config-provider';
import { SuperTokensProviders } from '@/components/supertokensProvider';
import { AuthProvider } from '@/context/auth/authContext';
import { BookingProvider } from '@/context/booking/bookingContext';
import { ProfileProvider } from '@/context/profile/profileContext';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

/** Wraps children in auth, booking, and query providers. */
export function AuthProvidersLayer({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthProvider>
      <BookingProvider>
        <QueryProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </QueryProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

/** Wraps children in runtime config, SuperTokens, and profile providers. */
export function OuterProviders({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <RuntimeConfigProvider>
      <SuperTokensProviders>
        <ProfileProvider>{children}</ProfileProvider>
      </SuperTokensProviders>
    </RuntimeConfigProvider>
  );
}

/** Composes all app-level providers. */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <OuterProviders>
      <AuthProvidersLayer>{children}</AuthProvidersLayer>
    </OuterProviders>
  );
}
