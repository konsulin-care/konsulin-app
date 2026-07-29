import ProfileCompletenessModal from '@/components/general/profile-completeness-modal';
import RouteResponseCleaner from '@/components/general/route-response-cleaner';
import QuickActionFab from '@/components/quick-action-fab';
import { FabProvider } from '@/context/fabContext';
import dynamic from 'next/dynamic';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ToastContainer, ToastContainerProps } from 'react-toastify';

const NextTopLoader = dynamic(
  () =>
    import('nextjs-toploader') as Promise<{
      default: ComponentType<Record<string, unknown>>;
    }>,
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
      <main className='mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl'>
        {children}
      </main>
    </div>
  );
}

function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <FabProvider>{children}</FabProvider>;
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
      <AppProviders>
        <PageContent>{children}</PageContent>
        <QuickActionFab />
      </AppProviders>
    </>
  );
}
