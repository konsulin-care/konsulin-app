import { buildReferralId } from '@/utils/referral-communication';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeReferralCommunication } from '../referral';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxios = { put: vi.fn() };

const PARTS = {
  sender: 'DG3F3STPYZ6HX25A',
  recipient: 'referee-id',
  batch: 'batch-1'
};

describe('writeReferralCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('PUTs the Communication with the deterministic id and If-None-Match', async () => {
    mockAxios.put.mockResolvedValue({ data: {} });

    const written = await writeReferralCommunication(PARTS);

    expect(written).toBe(true);
    const id = await buildReferralId(PARTS);
    expect(mockAxios.put).toHaveBeenCalledWith(
      `/fhir/Communication/${id}`,
      expect.objectContaining({ resourceType: 'Communication', id }),
      expect.objectContaining({ headers: { 'If-None-Match': '*' } })
    );
  });

  it('returns false instead of throwing on a 409 conflict', async () => {
    mockAxios.put.mockRejectedValue({ response: { status: 409 } });

    const written = await writeReferralCommunication(PARTS);

    expect(written).toBe(false);
  });

  it('rethrows non-conflict errors', async () => {
    mockAxios.put.mockRejectedValue(new Error('network down'));

    await expect(writeReferralCommunication(PARTS)).rejects.toThrow(
      'network down'
    );
  });
});
