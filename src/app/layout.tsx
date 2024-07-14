import QueryProvider from '@/components/general/query-provider'
import '@/styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const inter = Inter({ subsets: ['latin'] })

const APP_NAME = 'Konsulin'
const APP_DEFAULT_TITLE = 'Konsulin'
const APP_TITLE_TEMPLATE = '%s - Konsulin'
const APP_DESCRIPTION = 'Psychological kit in your pocket'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
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
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <QueryProvider>
          <div className='flex min-h-screen flex-col'>
            <ToastContainer />
            <div id='modal' />
            <main className='mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl'>
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  )
}
