import { RouteGate } from '@/components/route-gate';
import '@/styles/globals.css';
import '@/styles/index.scss';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import React from 'react';
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

/**
 * Root layout. The route gate chooses between the full app provider stack and
 * a minimal admin shell for /admin — SuperTokens session bootstrap never runs
 * inside the superadmin console.
 */
export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html lang='id'>
      <body className={inter.className} suppressHydrationWarning>
        <Script src='/js/pathname-init.js' strategy='beforeInteractive' />
        <Script src='/js/sw-register.js' strategy='beforeInteractive' />
        <Script
          id='locale-sync'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `try{var m=document.cookie.match(/NEXT_LOCALE=(en|id)/);if(m)document.documentElement.lang=m[1];}catch(e){}`
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <RouteGate>{children}</RouteGate>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
