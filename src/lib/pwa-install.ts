/**
 * PWA install prompt handling.
 * Captures the Chromium-only beforeinstallprompt event, defers it, and
 * exposes canInstall()/installPwa() so UI can offer installation on
 * demand. iOS Safari never fires the event and is untouched.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;

/** True when the browser has offered an install prompt not yet acted on. */
export function canInstall(): boolean {
  return deferredPrompt !== null && !installed;
}

/** Shows the deferred install prompt, if one is captured. */
export async function installPwa(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) return;
  await prompt.prompt();
  deferredPrompt = null;
}

/**
 * Starts capturing install events. Calls onChange whenever the
 * installability state changes. Returns an unsubscribe function.
 */
export function setupInstallPrompt(onChange?: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {
      // SSR: no listeners were registered.
    };
  }

  /** Captures the install prompt for later use by installPwa(). */
  const onBeforeInstall = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    onChange?.();
  };

  /** Marks the app as installed and clears the deferred prompt. */
  const onInstalled = () => {
    installed = true;
    deferredPrompt = null;
    onChange?.();
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    window.removeEventListener('appinstalled', onInstalled);
  };
}
