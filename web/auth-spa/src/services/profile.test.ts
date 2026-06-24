import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfileByIdentifier } from './profile';

describe('getProfileByIdentifier', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockBundleResponse(resourceType: string): void {
    // Cast through unknown/record to avoid FHIR union literal conflicts
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType,
            id: 'fhir-id-1'
          }
        }
      ]
    } as Bundle;
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundle)
    } as Response);
  }

  function mockEmptyBundle(): void {
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    } as Bundle;
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundle)
    } as Response);
  }

  it('returns non-null for Patient resource', async () => {
    mockBundleResponse('Patient');
    const result = await getProfileByIdentifier({
      userId: mockUserId,
      type: 'Patient'
    });
    expect(result).not.toBeNull();
    expect(result?.resourceType).toBe('Patient');
  });

  it('returns non-null for Practitioner resource', async () => {
    mockBundleResponse('Practitioner');
    const result = await getProfileByIdentifier({
      userId: mockUserId,
      type: 'Practitioner'
    });
    expect(result).not.toBeNull();
    expect(result?.resourceType).toBe('Practitioner');
  });

  it('returns non-null for Person resource', async () => {
    mockBundleResponse('Person');
    const result = await getProfileByIdentifier({
      userId: mockUserId,
      type: 'Person'
    });
    expect(result).not.toBeNull();
    expect(result?.resourceType).toBe('Person');
  });

  it('returns null for unknown resource type', async () => {
    mockBundleResponse('Device');
    const result = await getProfileByIdentifier({
      userId: mockUserId,
      type: 'Device'
    });
    expect(result).toBeNull();
  });

  it('returns null when bundle has no entries', async () => {
    mockEmptyBundle();
    const result = await getProfileByIdentifier({
      userId: mockUserId,
      type: 'Patient'
    });
    expect(result).toBeNull();
  });
});
