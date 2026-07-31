'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import { Roles } from '@/constants/roles';
import { STORES, dbDelete, dbGetAll } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { getAPI } from '@/services/api';
import { fetchCSRFToken, getAuthCookieSession } from '@/services/auth';
import type { Intent } from '@/utils/redirect-intent';
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

/** Thrown when switching the active role to Patient fails before a claim. */
class RoleSwitchError extends Error {}

/**
 * Ensure the active role is Patient before claiming an assessment result.
 * Returns true when a role switch + reload was triggered, false otherwise.
 */
async function ensurePatientRoleForClaim(): Promise<boolean> {
  const cookieSession = await getAuthCookieSession();
  if (!cookieSession?.authenticated) return false;
  if (cookieSession.role_name === Roles.Patient) return false;
  if (!cookieSession.roles?.includes(Roles.Patient)) return false;

  const token = await fetchCSRFToken();
  const res = await fetch('/auth/role/switch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(token ? { 'X-CSRF-Token': token } : {})
    },
    body: new URLSearchParams({ role: Roles.Patient })
  });
  if (!res.ok) {
    throw new RoleSwitchError(
      `role switch to Patient failed with status ${res.status}`
    );
  }
  // Full reload re-bootstraps auth as Patient; the still-pending intent
  // re-processes and claims against the patient resource.
  globalThis.location.reload();
  return true;
}

/** Claim the guest's assessment result and clean up the local draft. */
async function claimAssessmentResult(
  intent: Intent,
  signal: AbortSignal
): Promise<void> {
  const api = await getAPI();
  await api.patch('/api/v1/auth/anonymous/claim', null, { signal });
  toast.success('Your assessment result is now linked to your account.');

  // Clean up the local IndexedDB draft for the claimed QR
  if (!intent.payload.qrId) return;
  const allDrafts = await dbGetAll<{
    ownerId: string;
    questionnaireId: string;
    response: { id: string };
  }>(STORES.assessmentDrafts);
  const match = allDrafts.find(d => d.response?.id === intent.payload.qrId);
  if (match) {
    await dbDelete(STORES.assessmentDrafts, [
      match.ownerId,
      match.questionnaireId
    ]);
  }
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
        const roleSwitched = await ensurePatientRoleForClaim();
        if (roleSwitched) {
          // Page is reloading to re-bootstrap as Patient — abort this flow.
          return;
        }
        await claimAssessmentResult(intent, abortController.signal);

        router.push(intent.payload.path);
        clearIntent();
        return;
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Failed to restore intent:', error);
        if (error instanceof RoleSwitchError) {
          // Keep the intent so the claim can be retried after the role issue.
          toast.error(
            'Unable to switch to your patient account. Please try again.'
          );
        } else {
          toast.error(
            'Failed to link your assessment result. Please try again.'
          );
          clearIntent();
        }
      }
    } finally {
      if (isMounted) {
        setIsRedirecting(false);
        isHandlingRef.current = false;
      }
    }
  };

  run().catch(console.error);
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
