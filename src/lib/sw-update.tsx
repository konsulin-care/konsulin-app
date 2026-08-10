'use client';

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

/** Shows the update-available toast with a reload action. */
function notifyUpdate(registration: ServiceWorkerRegistration): void {
  const toastId = toast.info(
    <div className='flex items-center gap-3'>
      <span>Update available</span>
      <button
        type='button'
        className='cursor-pointer font-semibold text-teal-600 underline'
        onClick={() => {
          toast.dismiss(toastId);
          applySwUpdate(registration);
        }}
      >
        Reload
      </button>
    </div>,
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
