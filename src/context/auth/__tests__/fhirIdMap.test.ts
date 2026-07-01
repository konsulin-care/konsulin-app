import { dbGet, dbSet, STORES } from '@/lib/indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFhirIdForRole,
  getFhirIdMap,
  storeFhirIdForRole,
  storeFhirIdMap
} from '../fhirIdMap';

// Mock indexeddb module
vi.mock('@/lib/indexeddb', () => ({
  dbGet: vi.fn(),
  dbSet: vi.fn(),
  STORES: {
    guestSessions: 'guest_sessions',
    assessmentDrafts: 'assessment_drafts',
    soapDrafts: 'soap_drafts',
    serviceRequests: 'service_requests',
    tempBooking: 'temp_booking',
    uiPreferences: 'ui_preferences',
    navigationState: 'navigation_state',
    userProfile: 'user_profile'
  }
}));

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbSet = dbSet as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getFhirIdMap', () => {
  it('returns empty object when no map exists', async () => {
    mockDbGet.mockResolvedValue(null);
    const result = await getFhirIdMap('user-1');
    expect(result).toEqual({});
    expect(mockDbGet).toHaveBeenCalledWith(STORES.uiPreferences, [
      '',
      'fhirId_map_user-1'
    ]);
  });

  it('returns the stored map when it exists', async () => {
    mockDbGet.mockResolvedValue({
      value: { Patient: 'pt-123', Practitioner: 'prac-456' }
    });
    const result = await getFhirIdMap('user-1');
    expect(result).toEqual({ Patient: 'pt-123', Practitioner: 'prac-456' });
  });
});

describe('storeFhirIdMap', () => {
  it('persists the full map', async () => {
    await storeFhirIdMap('user-1', { Patient: 'pt-123' });
    expect(mockDbSet).toHaveBeenCalledWith(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'fhirId_map_user-1',
      value: { Patient: 'pt-123' }
    });
  });
});

describe('storeFhirIdForRole', () => {
  it('adds a role entry to an empty map', async () => {
    mockDbGet.mockResolvedValue(null);
    await storeFhirIdForRole('user-1', 'Patient', 'pt-123');
    expect(mockDbSet).toHaveBeenCalledWith(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'fhirId_map_user-1',
      value: { Patient: 'pt-123' }
    });
  });

  it('adds a role entry to an existing map', async () => {
    mockDbGet.mockResolvedValue({
      value: { Practitioner: 'prac-456' }
    });
    await storeFhirIdForRole('user-1', 'Patient', 'pt-123');
    expect(mockDbSet).toHaveBeenCalledWith(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'fhirId_map_user-1',
      value: { Patient: 'pt-123', Practitioner: 'prac-456' }
    });
  });

  it('overwrites an existing role entry', async () => {
    mockDbGet.mockResolvedValue({
      value: { Patient: 'old-pt' }
    });
    await storeFhirIdForRole('user-1', 'Patient', 'new-pt');
    expect(mockDbSet).toHaveBeenCalledWith(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'fhirId_map_user-1',
      value: { Patient: 'new-pt' }
    });
  });

  it('rejects __proto__ key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      storeFhirIdForRole('user-1', '__proto__', 'polluted')
    ).rejects.toThrow(TypeError);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it('rejects constructor key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      storeFhirIdForRole('user-1', 'constructor', 'polluted')
    ).rejects.toThrow(TypeError);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it('rejects prototype key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      storeFhirIdForRole('user-1', 'prototype', 'polluted')
    ).rejects.toThrow(TypeError);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it('rejects toString key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      storeFhirIdForRole('user-1', 'toString', 'polluted')
    ).rejects.toThrow(TypeError);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it('rejects __-prefixed custom key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      storeFhirIdForRole('user-1', '__custom', 'polluted')
    ).rejects.toThrow(TypeError);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it('allows a role already present even if it is a banned key', async () => {
    mockDbGet.mockResolvedValue({
      value: { constructor: 'ct-999' }
    });
    await storeFhirIdForRole('user-1', 'constructor', 'ct-888');
    expect(mockDbSet).toHaveBeenCalled();
  });
});

describe('getFhirIdForRole', () => {
  it('returns the fhirId for a stored role', async () => {
    mockDbGet.mockResolvedValue({
      value: { Patient: 'pt-123', Practitioner: 'prac-456' }
    });
    expect(await getFhirIdForRole('user-1', 'Patient')).toBe('pt-123');
    expect(await getFhirIdForRole('user-1', 'Practitioner')).toBe('prac-456');
  });

  it('returns undefined for a role not in the map', async () => {
    mockDbGet.mockResolvedValue({
      value: { Patient: 'pt-123' }
    });
    expect(await getFhirIdForRole('user-1', 'Practitioner')).toBeUndefined();
  });

  it('returns undefined when no map exists', async () => {
    mockDbGet.mockResolvedValue(null);
    expect(await getFhirIdForRole('user-1', 'Patient')).toBeUndefined();
  });

  it('rejects __proto__ key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      getFhirIdForRole('user-1', '__proto__')
    ).rejects.toThrow(TypeError);
  });

  it('rejects constructor key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      getFhirIdForRole('user-1', 'constructor')
    ).rejects.toThrow(TypeError);
  });

  it('rejects prototype key', async () => {
    mockDbGet.mockResolvedValue(null);
    await expect(
      getFhirIdForRole('user-1', 'prototype')
    ).rejects.toThrow(TypeError);
  });

  it('allows a legitimate role key', async () => {
    mockDbGet.mockResolvedValue({
      value: { Practitioner: 'prac-456' }
    });
    await expect(
      getFhirIdForRole('user-1', 'Practitioner')
    ).resolves.toBe('prac-456');
  });

  it('allows retrieving a banned key if already stored', async () => {
    mockDbGet.mockResolvedValue({
      value: { constructor: 'ct-999' }
    });
    await expect(
      getFhirIdForRole('user-1', 'constructor')
    ).resolves.toBe('ct-999');
  });
});
