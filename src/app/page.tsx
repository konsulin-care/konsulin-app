'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAPI } from '@/services/api';
import { clearIntent, getIntent } from '@/utils/intent-storage';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { isLoading, state: authState } = useAuth();
  const router = useRouter();

  const [isRedirecting, setIsRedirecting] = useState(true);
  const isHandlingIntentRef = useRef(false);
  const hasRunReloadAnonymousRef = useRef(false);

  // Refresh anonymous session on manual reload of homepage only — not when navigating to /
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== 'reload') return;
    if (window.location.pathname !== '/') return;
    // Only run if this document load was for / (reload of homepage), not when user navigated to /
    let initialPathname: string | null = null;
    try {
      initialPathname = sessionStorage.getItem('konsulin_initial_pathname');
    } catch {
      // ignore
    }
    if (initialPathname !== '/') return;
    // Already ran this document load (e.g. user reloaded / then navigated away and back)
    try {
      if (sessionStorage.getItem('konsulin_reload_anonymous_done') === '1')
        return;
    } catch {
      // ignore
    }
    if (hasRunReloadAnonymousRef.current) return;
    if (isLoading) return;
    if (authState.isAuthenticated) return;

    // Cookie guard: avoid race where context says not signed in but cookie already set
    let auth: { userId?: string; role_name?: string } = {};
    try {
      auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));
    } catch {
      // ignore parse errors
    }
    if (auth?.userId && auth?.role_name) return;

    hasRunReloadAnonymousRef.current = true;
    try {
      sessionStorage.setItem('konsulin_reload_anonymous_done', '1');
    } catch {
      // ignore
    }
    ensureAnonymousSession(true).catch(err => {
      console.error('Failed to refresh anonymous session on reload:', err);
    });
  }, [isLoading, authState.isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    let abortController: AbortController | null = null;
    let isMounted = true;

    let storedRedirect: string | null = null;
    try {
      storedRedirect = localStorage.getItem('redirect');
      if (storedRedirect) {
        localStorage.removeItem('redirect');
      }
    } catch (error) {
      console.error('Failed to access redirect in localStorage:', error);
      setIsRedirecting(false);
      return;
    }

    if (storedRedirect) {
      try {
        const decoded = decodeURIComponent(storedRedirect);
        if (decoded.startsWith('/') && !decoded.startsWith('//')) {
          const currentPath =
            window.location.pathname +
            window.location.search +
            window.location.hash;
          if (decoded === currentPath) {
            setIsRedirecting(false);
            return () => {
              isMounted = false;
            };
          }
          try {
            router.push(decoded);
          } finally {
            setIsRedirecting(false);
          }
          return () => {
            isMounted = false;
          };
        }
        console.warn('Invalid redirect path (not relative):', decoded);
        setIsRedirecting(false);
        return () => {
          isMounted = false;
        };
      } catch (error) {
        console.error('Invalid redirect value in localStorage:', error);
        setIsRedirecting(false);
        return () => {
          isMounted = false;
        };
      }
    }

    if (authState.isAuthenticated) {
      let intent: ReturnType<typeof getIntent> | null = null;
      try {
        intent = getIntent();
      } catch (error) {
        console.error('Failed to access intent in localStorage:', error);
      }

      if (intent) {
        const handleIntent = async () => {
          if (isHandlingIntentRef.current) return;
          isHandlingIntentRef.current = true;
          abortController = new AbortController();
          try {
            if (intent.kind === 'journal') {
              router.push(intent.payload.path);
              clearIntent();
              return;
            }

            if (intent.kind === 'appointment') {
              router.push(intent.payload.path);
              clearIntent();
              return;
            }

            if (intent.kind === 'assessmentResult') {
              const { path } = intent.payload;
              const api = await getAPI();

              await api.patch('/api/v1/auth/anonymous/claim', null, {
                signal: abortController.signal
              });

              if (isMounted) {
                toast.success(
                  'Your assessment result is now linked to your account.'
                );
                router.push(path);
                clearIntent();
                return;
              }
            }
          } catch (error) {
            if ((error as Error)?.name !== 'AbortError') {
              console.error('Failed to restore intent:', error);
              toast.error(
                'Failed to link your assessment result. Please try again.'
              );
              clearIntent();
            }
          } finally {
            if (isMounted) {
              setIsRedirecting(false);
              isHandlingIntentRef.current = false;
            }
          }
        };

        handleIntent();
        return () => {
          isMounted = false;
          abortController?.abort();
        };
      }
    }

    setIsRedirecting(false);
    return () => {
      isMounted = false;
      abortController?.abort();
    };
  }, [isLoading, authState.isAuthenticated, authState.userInfo, router]);

  if (isLoading || isRedirecting) {
    return (
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-[16px] bg-white pt-4 pb-[100px]'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  return (
    <>
      <NavigationBar />
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
