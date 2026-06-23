'use client';

import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAPI } from '@/services/api';
import {
  clearIntent,
  clearRedirectIntent,
  getIntent,
  getRedirectIntent
} from '@/utils/redirect-intent';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { IStateAuth } from '@/context/auth/authTypes';

interface UseRedirectIntentOptions {
  isLoading: boolean;
  authState: IStateAuth;
}

/** Refresh anonymous session on homepage reload if no authenticated session. */
function useReloadAnonymousSession(
  isLoading: boolean,
  isAuthenticated: boolean
) {
  const hasRunRef = useRef(false);
  useEffect(() => {
    if (globalThis.window === undefined) return;
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type !== 'reload' || globalThis.window.location.pathname !== '/')
      return;
    try {
      if (sessionStorage.getItem('konsulin_initial_pathname') !== '/') return;
    } catch {
      return;
    }
    try {
      if (sessionStorage.getItem('konsulin_reload_anonymous_done') === '1')
        return;
    } catch {
      /* ignore */
    }
    if (hasRunRef.current || isLoading || isAuthenticated) return;

    (async () => {
      try {
        const res = await fetch('/auth/cookie');
        const data = await res.json();
        if (data.authenticated) return;
      } catch {
        /* proceed with anonymous session */
      }
      hasRunRef.current = true;
      try {
        sessionStorage.setItem('konsulin_reload_anonymous_done', '1');
      } catch {
        /* ignore */
      }
      await ensureAnonymousSession(true);
    })().catch((err: unknown) =>
      console.error('Failed to refresh anonymous session on reload:', err)
    );
  }, [isLoading, isAuthenticated]);
}

/** Handle a redirect stored in cookie before auth was ready. */
function handleStoredRedirect(
  setIsRedirecting: (v: boolean) => void,
  router: ReturnType<typeof useRouter>
): boolean {
  const storedRedirect = getRedirectIntent();
  if (!storedRedirect) return false;

  clearRedirectIntent();

  try {
    const decoded = decodeURIComponent(storedRedirect);
    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      const currentPath =
        globalThis.window.location.pathname +
        globalThis.window.location.search +
        globalThis.window.location.hash;
      if (decoded === currentPath) {
        setIsRedirecting(false);
        return true;
      }
      router.push(decoded);
      setIsRedirecting(false);
      return true;
    }
    console.warn('Invalid redirect path (not relative):', decoded);
  } catch (error) {
    console.error('Invalid redirect value in cookie:', error);
  }

  setIsRedirecting(false);
  return true;
}

/** Process a pending intent (journal, appointment, assessment). */
function handleIntent(
  setIsRedirecting: (v: boolean) => void,
  isHandlingRef: { current: boolean },
  router: ReturnType<typeof useRouter>
): (() => void) | undefined {
  const intent = getIntent();
  if (!intent || isHandlingRef.current) return undefined;
  isHandlingRef.current = true;

  const abortController = new AbortController();
  let isMounted = true;

  /** Execute the intent's navigation or API claim flow. */
  const run = async () => {
    try {
      if (intent.kind === 'journal' || intent.kind === 'appointment') {
        router.push(intent.payload.path);
        clearIntent();
        return;
      }
      if (intent.kind === 'assessmentResult' && isMounted) {
        const api = await getAPI();
        await api.patch('/api/v1/auth/anonymous/claim', null, {
          signal: abortController.signal
        });
        toast.success('Your assessment result is now linked to your account.');
        router.push(intent.payload.path);
        clearIntent();
        return;
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Failed to restore intent:', error);
        toast.error('Failed to link your assessment result. Please try again.');
        clearIntent();
      }
    } finally {
      if (isMounted) {
        setIsRedirecting(false);
        isHandlingRef.current = false;
      }
    }
  };

  void run();
  return () => {
    isMounted = false;
    abortController.abort();
  };
}

/**
 *
 */
export function useRedirectIntent({
  isLoading,
  authState
}: UseRedirectIntentOptions) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const isHandlingIntentRef = useRef(false);

  useReloadAnonymousSession(isLoading, authState.isAuthenticated);

  useEffect(() => {
    let cleanup;
    if (isLoading) {
      // wait for loading to finish
    } else if (handleStoredRedirect(setIsRedirecting, router)) {
      // redirect handled
    } else if (authState.isAuthenticated) {
      cleanup = handleIntent(setIsRedirecting, isHandlingIntentRef, router);
      if (!cleanup) {
        setIsRedirecting(false);
      }
    } else {
      setIsRedirecting(false);
    }
    return cleanup;
  }, [isLoading, authState.isAuthenticated, authState.userInfo, router]);

  return { isRedirecting };
}
