import ProfileCompletenessModal from '@/components/general/profile-completeness-modal';
import QueryProvider from '@/components/general/query-provider';
import RouteResponseCleaner from '@/components/general/route-response-cleaner';
import { RuntimeConfigProvider } from '@/components/general/runtime-config-provider';
import QuickActionFab from '@/components/quick-action-fab';
import { SuperTokensProviders } from '@/components/supertokensProvider';
import { AuthProvider } from '@/context/auth/authContext';
import { BookingProvider } from '@/context/booking/bookingContext';
import { FabDirtyProvider } from '@/context/fabDirtyContext';
import { ProfileProvider } from '@/context/profile/profileContext';
import '@/styles/globals.css';
import '@/styles/index.scss';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import React, { Suspense } from 'react';
import 'react-international-phone/style.css';
import { ToastContainer, ToastContainerProps } from 'react-toastify';
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

const toastConfig: ToastContainerProps = {
  position: 'top-right',
  autoClose: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true
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

/** Main page layout wrapper. */
function PageContent({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='flex min-h-screen flex-col'>
      <div id='modal' />
      <main className='mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl'>
        {children}
      </main>
    </div>
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
        <Script
          src='/js/sw-register.js'
          strategy='afterInteractive'
          type='module'
        />
        <AppProviders>
          <RouteResponseCleaner />
          <NextTopLoader showSpinner={false} color='#13c2c2' />
          <ToastContainer {...toastConfig} />
          <ProfileCompletenessModal />
          <FabDirtyProvider>
            <PageContent>{children}</PageContent>
            <QuickActionFab />
          </FabDirtyProvider>
        </AppProviders>
      </body>
    </html>
  );
}
