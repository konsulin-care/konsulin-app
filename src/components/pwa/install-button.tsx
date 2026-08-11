'use client';

import { canInstall, installPwa, setupInstallPrompt } from '@/lib/pwa-install';
import { useEffect, useState } from 'react';

/** Offers PWA installation when the browser exposes an install prompt. */
export default function InstallButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return setupInstallPrompt(() => {
      setVisible(canInstall());
    });
  }, []);

  /** Shows the deferred browser install prompt. */
  const handleInstallClick = () => {
    // skipcq: JS-0098 - fire-and-forget install prompt
    void installPwa();
  };

  if (!visible) return null;

  return (
    <button
      type='button'
      onClick={handleInstallClick}
      className='cursor-pointer font-semibold text-teal-600 underline'
    >
      Install app
    </button>
  );
}
