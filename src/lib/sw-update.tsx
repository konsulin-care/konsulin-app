'use client';

import { useTranslations } from '@/i18n';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

/** Message the service worker listens for to skip waiting. */
export const SKIP_WAITING_MESSAGE = 'SKIP_WAITING';

/**
 * Reloads the app with the updated service worker. If a worker is
 * waiting, it is told to skip waiting and the page reloads once it
 * takes control; otherwise the page reloads immediately.
 */
export function applySwUpdate(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    registration.waiting.postMessage({ type: SKIP_WAITING_MESSAGE });
  } else {
    window.location.reload();
  }
}

/**
 * Update-available toast body. Translates its labels via t() and
 * dismisses the toast before applying the update.
 */
function SwUpdateToastContent({
  registration,
  onDismiss
}: {
  readonly registration: ServiceWorkerRegistration;
  readonly onDismiss: () => void;
}) {
  const t = useTranslations('common');
  return (
    <div className='flex items-center gap-3'>
      <span>{t('sw.update_available')}</span>
      <button
        type='button'
        className='cursor-pointer font-semibold text-teal-600 underline'
        onClick={() => {
          onDismiss();
          applySwUpdate(registration);
        }}
      >
        {t('sw.reload')}
      </button>
    </div>
  );
}

/** Shows the update-available toast with a reload action. */
function notifyUpdate(registration: ServiceWorkerRegistration): void {
  // Toast id is only known after toast.info returns; hold it for dismissal.
  const toastIdRef: { current?: string | number } = {};
  toastIdRef.current = toast.info(
    <SwUpdateToastContent
      registration={registration}
      onDismiss={() => {
        if (toastIdRef.current !== undefined) toast.dismiss(toastIdRef.current);
      }}
    />,
    { autoClose: false, closeOnClick: false }
  );
}

/**
 * Watches the service worker registration for updates and notifies the
 * user when a new version is installed. Returns an unsubscribe function.
 */
export function setupSwUpdateDetection(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {
      // Service workers unsupported — nothing to watch.
    };
  }

  let active = true;
  // skipcq: JS-0098 - fire-and-forget; the registration promise resolves async
  void (async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!active) return;
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        const isUpdate = navigator.serviceWorker.controller !== null;
        if (newWorker.state === 'installed' && isUpdate) {
          notifyUpdate(registration);
        }
      });
    });
  })();

  return () => {
    active = false;
  };
}

/** Mounts SW update detection for the lifetime of the app. */
export default function SwUpdateDetector() {
  useEffect(() => setupSwUpdateDetection(), []);
  return null;
}
