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

  it('reads clinic_organization from IndexedDB', async () => {
    vi.mocked(dbGet).mockResolvedValueOnce({ value: 'org-1' });

    const { result } = renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(result.current.clinicId).toBe('org-1');
    });
  });

  it('returns empty clinicId when value is not stored', async () => {
    vi.mocked(dbGet).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(result.current.clinicId).toBe('');
    });
  });

  it('queries IndexedDB with clinic_organization key', async () => {
    vi.mocked(dbGet).mockResolvedValue(null);

    renderHook(() => useClinicContext());

    await waitFor(() => {
      expect(dbGet).toHaveBeenCalledTimes(1);
    });
    expect(dbGet).toHaveBeenCalledWith(STORES.uiPreferences, [
      '',
      'clinic_organization'
    ]);
  });
});
