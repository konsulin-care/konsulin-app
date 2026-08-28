import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequest, mockGetAPI } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGetAPI: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: mockGetAPI
}));

// eslint-disable-next-line import/first
import {
  adminRequest,
  clearAdminKey,
  parseAdminKeyError,
  setAdminKey
} from '@/services/admin-api';

describe('admin-api', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockGetAPI.mockReset();
    mockGetAPI.mockResolvedValue({ request: mockRequest });
  });

  it('adminRequest calls getAPI() with default proxy', async () => {
    mockRequest.mockResolvedValue({ data: { total: 1 } });
    await adminRequest('GET', '/fhir/Organization');

    expect(mockGetAPI).toHaveBeenCalledWith();
  });

  it('never sets X-API-Key from JS (cookie custody only)', async () => {
    mockRequest.mockResolvedValue({ data: { total: 1 } });
    await adminRequest('GET', '/fhir/Organization');
    const config = mockRequest.mock.calls[0][0] as Record<string, unknown>;
    const headers = (config.headers ?? {}) as Record<string, unknown>;
    expect(headers['X-API-Key']).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('adminRequest forwards method, path, body and params', async () => {
    mockRequest.mockResolvedValue({ data: { id: 'o1' } });

    const result = await adminRequest(
      'POST',
      '/fhir/Organization',
      { resourceType: 'Organization', name: 'Konsulin' },
      { _count: 10 }
    );

    expect(mockRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/fhir/Organization',
      data: { resourceType: 'Organization', name: 'Konsulin' },
      params: { _count: 10 }
    });
    expect(result).toEqual({ id: 'o1' });
  });

  it('setAdminKey calls getAPI({ proxy: false }) for BFF-only route', async () => {
    mockRequest.mockResolvedValue({ data: { success: true } });

    await setAdminKey('sa-secret');

    expect(mockGetAPI).toHaveBeenCalledWith({ proxy: false });
    expect(mockRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/admin/key',
      data: { apiKey: 'sa-secret' }
    });
  });

  it('clearAdminKey calls getAPI({ proxy: false }) for BFF-only route', async () => {
    mockRequest.mockResolvedValue({ data: { success: true } });

    await clearAdminKey();

    expect(mockGetAPI).toHaveBeenCalledWith({ proxy: false });
    expect(mockRequest).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/api/admin/key'
    });
  });
});

describe('parseAdminKeyError', () => {
  it('extracts the backend error message', () => {
    const err = {
      response: { status: 401, data: { message: 'invalid API key' } }
    };
    expect(parseAdminKeyError(err)).toBe('invalid API key');
  });

  it('requests a retry after a 401 on an invalid key (message surfaced)', () => {
    const err = {
      response: { status: 401, data: { message: 'invalid or expired API key' } }
    };
    expect(parseAdminKeyError(err)).toContain('API key');
  });

  it('falls back to the generic message without a response', () => {
    expect(parseAdminKeyError(new Error('network down'))).toBe(
      'An unexpected error occurred'
    );
  });

  it('suggests retrying only the current attempt, never showing the key', () => {
    const err = { response: { status: 500, data: { message: 'oops' } } };
    const msg = parseAdminKeyError(err);
    expect(msg).toContain('oops');
    expect(msg).not.toContain('sa-secret');
  });
});
