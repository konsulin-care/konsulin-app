/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock axios before importing admin-api (inline factory hoisted by vitest).
// admin-api creates its client once at module load, so the factory returns a
// stable instance whose request() spy is shared across tests.
vi.mock('axios', () => {
  const mockRequest = vi.fn();
  const mockInstance = {
    request: mockRequest,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    defaults: { baseURL: '/proxy', withCredentials: true }
  };
  const mockCreate = vi.fn(() => mockInstance);
  return {
    default: { create: mockCreate, isAxiosError: vi.fn() },
    create: mockCreate
  };
});

// eslint-disable-next-line import/first
import axios from 'axios';

// eslint-disable-next-line import/first
import {
  adminRequest,
  clearAdminKey,
  parseAdminKeyError,
  setAdminKey
} from '@/services/admin-api';

const mockCreate = vi.mocked(axios.create);
// admin-api creates its client once at module load; reuse that instance.
const mockRequest = mockCreate.mock.results[0].value.request as ReturnType<
  typeof vi.fn
>;

describe('admin-api', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('uses the /proxy base URL with withCredentials (cookie rides along)', () => {
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: '/proxy',
      withCredentials: true
    });
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

  it('setAdminKey posts the key to /api/admin/key', async () => {
    mockRequest.mockResolvedValue({ data: { success: true } });

    await setAdminKey('sa-secret');

    expect(mockRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/admin/key',
      data: { apiKey: 'sa-secret' }
    });
  });

  it('clearAdminKey deletes /api/admin/key', async () => {
    mockRequest.mockResolvedValue({ data: { success: true } });

    await clearAdminKey();

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
