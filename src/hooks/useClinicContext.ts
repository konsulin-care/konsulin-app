'use client';

import { STORES, dbGet } from '@/lib/indexeddb';
import { useEffect, useState } from 'react';

type ClinicContext = {
  clinicId: string;
  locationId: string;
};

/**
 * Read the admin's selected clinic and location from IndexedDB.
 *
 * Reads `selected_clinic` and `selected_location` from `uiPreferences`
 * store once on mount. Returns empty strings when not yet stored.
 */
export function useClinicContext(): ClinicContext {
  const [clinicId, setClinicId] = useState('');
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_clinic'])
      .then(saved => {
        if (saved?.value) setClinicId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable */
      });
  }, []);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_location'])
      .then(saved => {
        if (saved?.value) setLocationId(saved.value);
        return null;
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return { clinicId, locationId };
}
