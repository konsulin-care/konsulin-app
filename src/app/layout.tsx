import AppChrome from '@/components/app-chrome';
import QueryProvider from '@/components/general/query-provider';
import { RuntimeConfigProvider } from '@/components/general/runtime-config-provider';
import { SuperTokensProviders } from '@/components/supertokensProvider';
import { AuthProvider } from '@/context/auth/authContext';
import { BookingProvider } from '@/context/booking/bookingContext';
import { ProfileProvider } from '@/context/profile/profileContext';
import '@/styles/globals.css';
import '@/styles/index.scss';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import React, { Suspense } from 'react';
import 'react-international-phone/style.css';
import 'react-toastify/dist/ReactToastify.css';

const inter = Plus_Jakarta_Sans({ subsets: ['latin'] });

const APP_NAME = 'Konsulin';
const APP_DEFAULT_TITLE = 'Konsulin';
const APP_TITLE_TEMPLATE = '%s - Konsulin';
const APP_DESCRIPTION = 'Psychological kit in your pocket';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF'
};

/** Wraps children in auth, booking, and query providers. */
function AuthProvidersLayer({
  children
}: Readonly<{ children: React.ReactNode }>) {
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
function OuterProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RuntimeConfigProvider>
      <SuperTokensProviders>
        <ProfileProvider>{children}</ProfileProvider>
      </SuperTokensProviders>
    </RuntimeConfigProvider>
  );
}

/** Composes all app-level providers. */
function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <OuterProviders>
      <AuthProvidersLayer>{children}</AuthProvidersLayer>
    </OuterProviders>
  );
}

/**
 *
 */
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <Script src='/js/pathname-init.js' strategy='beforeInteractive' />
        <Script src='/js/sw-register.js' strategy='beforeInteractive' />
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
