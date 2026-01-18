import QueryProvider from '@/components/general/query-provider';
import RouteResponseCleaner from '@/components/general/route-response-cleaner';
import ProfileCompletenessModal from '@/components/general/profile-completeness-modal';
import { SuperTokensProviders } from '@/components/supertokensProvider';
import { AuthProvider } from '@/context/auth/authContext';
import { BookingProvider } from '@/context/booking/bookingContext';
import { ProfileProvider } from '@/context/profile/profileContext';
import '@/styles/globals.css';
import '@/styles/index.scss';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
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

function safeSerialize(obj: any) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function fetchRuntimeConfig() {
  try {
    const host =
      headers().get('host') ??
      process.env.NEXT_PUBLIC_SITE_ORIGIN ??
      'localhost:3000';
    const proto =
      headers().get('x-forwarded-proto') ??
      (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const base = `${proto}://${host}`;

    const res = await fetch(`${base}/api/config`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);

    const raw = await res.json();
    return {
      appInfo: {
        appName: raw.APP_NAME,
        apiDomain: raw.API_URL,
        websiteDomain: raw.APP_URL,
        apiBasePath: raw.API_BASE_PATH,
        websiteBasePath: raw.APP_AUTH_PATH
      },
      // keep other values if you want them later
      terminologyServer: raw.TERMINOLOGY_SERVER
    };
  } catch (err) {
    // fallback defaults
    return {
      appInfo: {
        appName: 'Konsulin',
        apiDomain: '',
        websiteDomain: 'http://localhost:3000',
        apiBasePath: '/api/v1/auth',
        websiteBasePath: '/auth'
      },
      terminologyServer: ''
    };
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimeConfig = await fetchRuntimeConfig();
  const serialized = safeSerialize(runtimeConfig);

  return (
    <html lang='en'>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__ = ${serialized};`
          }}
        />
      </head>
      <body className={inter.className}>
        <SuperTokensProviders>
          <ProfileProvider>
            <AuthProvider>
              <BookingProvider>
                <QueryProvider>
                  <Suspense fallback={null}>
                    <RouteResponseCleaner />
                    <NextTopLoader showSpinner={false} color='#13c2c2' />
                    <ToastContainer {...toastConfig} />
                    <ProfileCompletenessModal />
                    <div className='flex min-h-screen flex-col'>
                      <div id='modal' />
                      <main className='mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl'>
                        {children}
                      </main>
                    </div>
                  </Suspense>
                </QueryProvider>
              </BookingProvider>
            </AuthProvider>
          </ProfileProvider>
        </SuperTokensProviders>
      </body>
    </html>
  );
}
