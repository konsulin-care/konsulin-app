import { dbGet, STORES } from '@/lib/indexeddb';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClinicContext } from '../useClinicContext';

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

describe('useClinicContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('reads selected_clinic and selected_location from IndexedDB', async () => {
    vi.mocked(dbGet)
      .mockResolvedValueOnce({ value: 'clinic-1' }) // selected_clinic
      .mockResolvedValueOnce({ value: 'loc-1' }); // selected_location

    const { result } = renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(result.current.clinicId).toBe('clinic-1');
    });
    expect(result.current.locationId).toBe('loc-1');
  });

  it('returns empty strings when values are not stored', async () => {
    vi.mocked(dbGet)
      .mockResolvedValueOnce(null) // selected_clinic
      .mockResolvedValueOnce(null); // selected_location

    const { result } = renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(result.current.clinicId).toBe('');
    });
    expect(result.current.locationId).toBe('');
  });

  it('queries IndexedDB with correct keys', async () => {
    vi.mocked(dbGet).mockResolvedValue(null);

    renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(dbGet).toHaveBeenCalledTimes(2);
    });
    expect(dbGet).toHaveBeenCalledWith(STORES.uiPreferences, [
      '',
      'selected_clinic'
    ]);
    expect(dbGet).toHaveBeenCalledWith(STORES.uiPreferences, [
      '',
      'selected_location'
    ]);
  });
});
