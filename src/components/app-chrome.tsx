'use client';

import AppSidebar from '@/components/app-sidebar';
import ContentActionBar from '@/components/content-action-bar';
import ProfileCompletenessModal from '@/components/general/profile-completeness-modal';
import RouteResponseCleaner from '@/components/general/route-response-cleaner';
import ConnectivityIndicator from '@/components/pwa/connectivity-indicator';
import InstallButton from '@/components/pwa/install-button';
import PendingSubmissionsBanner from '@/components/pwa/pending-submissions';
import QuickActionFab from '@/components/quick-action-fab';
import { FabProvider } from '@/context/fabContext';
import { RecommendationProvider } from '@/context/recommendationContext';
import { useTranslations } from '@/i18n';
import { resolveCjsDefaultExport } from '@/lib/lazy-component';
import SwUpdateDetector from '@/lib/sw-update';
import { TOKENS } from '@/styles/tokens';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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

/** Routes that render without the responsive app shell navigation. */
const BARE_SHELL_ROUTES = [
  '/auth',
  '/logout',
  '/remove-account',
  '/unauthorized',
  '/~offline'
];

/**
 * Tells whether a pathname renders without the app shell navigation.
 *
 * @param pathname - The current pathname, e.g. `/auth/login`
 * @returns True when the route (or a subpath) is a bare shell route
 */
export function isBareShellPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return BARE_SHELL_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}

const SKIP_LINK_CLASSNAME =
  'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg';

const SIDEBAR_CLASSNAME =
  'hidden md:flex sticky top-0 z-30 h-dvh border-r border-border bg-background';

const SHELL_CLASSNAME =
  'flex min-h-screen flex-col md:grid md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]';

const CONTENT_COLUMN_CLASSNAME = 'flex min-w-0 flex-col';

const MAIN_CLASSNAME =
  'relative left-[calc(50vw_-_50%)] mx-auto flex min-h-full w-full max-w-screen-sm grow flex-col sm:shadow-2xl';

const MAIN_SHELL_CLASSNAME =
  'md:left-0 md:shadow-none md:border-x md:border-border lg:has-[[data-layout=wide]]:max-w-[1040px] xl:has-[[data-layout=split]]:max-w-[1040px]';

/** Main page layout wrapper. */
function PageContent({
  isBare,
  children
}: Readonly<{ isBare: boolean; children: ReactNode }>) {
  return (
    <main
      id='main'
      tabIndex={-1}
      className={`${MAIN_CLASSNAME} ${isBare ? '' : MAIN_SHELL_CLASSNAME}`}
    >
      {children}
      {isBare ? null : <ContentActionBar />}
    </main>
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
  const t = useTranslations('page-header');
  const isBare = isBareShellPath(usePathname());

  return (
    <>
      <RouteResponseCleaner />
      <Suspense fallback={null}>
        <NextTopLoader showSpinner={false} color={TOKENS.turquoiseDeep} />
      </Suspense>
      <ToastContainer {...toastConfig} />
      <ProfileCompletenessModal />
      <SwUpdateDetector />
      <AppProviders>
        <a href='#main' className={SKIP_LINK_CLASSNAME}>
          {t('skip_to_content')}
        </a>
        <div id='modal' />
        <div
          data-shell={isBare ? undefined : 'nav'}
          className={isBare ? 'flex min-h-screen flex-col' : SHELL_CLASSNAME}
        >
          {isBare ? null : <AppSidebar className={SIDEBAR_CLASSNAME} />}
          <div className={CONTENT_COLUMN_CLASSNAME}>
            <ConnectivityIndicator />
            <PendingSubmissionsBanner />
            <PageContent isBare={isBare}>{children}</PageContent>
            <InstallButton />
          </div>
        </div>
        <QuickActionFab />
      </AppProviders>
    </>
  );
}
