import { describe, expect, it, vi } from 'vitest';
import { purgeResearchData } from '../privacy';

const { mockGetAPI, mockDelete } = vi.hoisted(() => ({
  mockGetAPI: vi.fn(),
  mockDelete: vi.fn()
}));

vi.mock('../../api', () => ({
  getAPI: mockGetAPI
}));

describe('purgeResearchData', () => {
  it('issues DELETE to /api/v1/privacy/purge via the proxy instance', async () => {
    mockGetAPI.mockResolvedValue({ delete: mockDelete });
    mockDelete.mockResolvedValue({ data: { status: 'ok' } });

    await purgeResearchData();

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/privacy/purge');
  });

  it('propagates failures from the purge endpoint', async () => {
    mockGetAPI.mockResolvedValue({ delete: mockDelete });
    mockDelete.mockRejectedValue(new Error('purge failed'));

    await expect(purgeResearchData()).rejects.toThrow('purge failed');
  });
});
