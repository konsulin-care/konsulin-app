'use client';

import { STORES, dbGet } from '@/lib/indexeddb';
import { useEffect, useState } from 'react';

type ClinicContext = {
  clinicId: string;
  /** @deprecated Always empty string. No longer persisted. */
  locationId: string;
};

/**
 * Read the admin's clinic organization from IndexedDB.
 *
 * Reads `clinic_organization` (the admin's bound org from
 * Person.managingOrganization) from `uiPreferences` store once on mount.
 * Returns empty strings when not yet stored.
 */
export function useClinicContext(): ClinicContext {
  const [clinicId, setClinicId] = useState('');

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setClinicId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable */
      });
  }, []);

  return { clinicId, locationId: '' };
}
