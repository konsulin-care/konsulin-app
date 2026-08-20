import ProfileCompletenessModal from '@/components/general/profile-completeness-modal';
import RouteResponseCleaner from '@/components/general/route-response-cleaner';
import ConnectivityIndicator from '@/components/pwa/connectivity-indicator';
import InstallButton from '@/components/pwa/install-button';
import PendingSubmissionsBanner from '@/components/pwa/pending-submissions';
import QuickActionFab from '@/components/quick-action-fab';
import { FabProvider } from '@/context/fabContext';
import { RecommendationProvider } from '@/context/recommendationContext';
import { resolveCjsDefaultExport } from '@/lib/lazy-component';
import SwUpdateDetector from '@/lib/sw-update';
import dynamic from 'next/dynamic';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ToastContainer, ToastContainerProps } from 'react-toastify';

const NextTopLoader = dynamic(
  async () => {
    const mod = await import('nextjs-toploader');
    return {
      default: resolveCjsDefaultExport(mod) as ComponentType<
        Record<string, unknown>
      >
    };
  },
  { ssr: false }
);

const toastConfig: ToastContainerProps = {
  position: 'top-right',
  autoClose: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true
};

/** Main page layout wrapper. */
function PageContent({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className='flex min-h-screen flex-col'>
      <div id='modal' />
      <main className='relative left-[calc(50vw_-_50%)] mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl'>
        {children}
      </main>
    </div>
  );
}

/** Wraps children in app-wide context providers. */
function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <FabProvider>
      <RecommendationProvider>{children}</RecommendationProvider>
    </FabProvider>
  );
}

/** Renders app chrome: top loader, toasts, modals, FAB, and page content. */
export default function AppChrome({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <RouteResponseCleaner />
      <Suspense fallback={null}>
        <NextTopLoader showSpinner={false} color='#13c2c2' />
      </Suspense>
      <ToastContainer {...toastConfig} />
      <ProfileCompletenessModal />
      <SwUpdateDetector />
      <AppProviders>
        <ConnectivityIndicator />
        <PendingSubmissionsBanner />
        <PageContent>{children}</PageContent>
        <InstallButton />
        <QuickActionFab />
      </AppProviders>
    </>
  );
}
