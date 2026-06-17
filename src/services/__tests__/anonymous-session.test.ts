import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAnonymousIdentifier,
  decodeJwtPayload,
  ensureAnonymousSession
} from '@/services/anonymous-session';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockApi = {
  post: vi.fn()
};

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    // Header: {"alg":"HS256","typ":"JWT"}
    // Payload: {"guest_id":"abc123"}
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJndWVzdF9pZCI6ImFiYzEyMyJ9.' +
      'signature';
    const result = decodeJwtPayload(token);
    expect(result).toEqual({ guest_id: 'abc123' });
  });

  it('returns null for invalid token', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('not.a.jwt')).toBeNull();
  });

  it('returns null for token with only one part', () => {
    expect(decodeJwtPayload('abc')).toBeNull();
  });
});

describe('buildAnonymousIdentifier', () => {
  it('builds a FHIR Identifier with the correct system and value', () => {
    const result = buildAnonymousIdentifier('guest-123');
    expect(result.system).toBe(
      'https://login.konsulin.care/guestid'
    );
    expect(result.value).toBe('guest-123');
  });
});

describe('ensureAnonymousSession', () => {
  beforeEach(() => {
    vi.mocked(getAPI).mockResolvedValue(mockApi as any);
    mockApi.post.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the API without force param by default (no argument)', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJndWVzdF9pZCI6ImFiYzEyMyJ9.' +
      'signature';
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token,
          guest_id: 'abc123'
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const result = await ensureAnonymousSession();

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/auth/anonymous-session',
      undefined,
      undefined
    );
    expect(result).toBe('abc123');
  });

  it('calls the API with force param when passed true', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJndWVzdF9pZCI6ImFiYzEyMyJ9.' +
      'signature';
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token,
          guest_id: 'abc123'
        }
      }
    });

    const result = await ensureAnonymousSession(true);

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/auth/anonymous-session',
      undefined,
      { params: { force_new: 'true' } }
    );
    expect(result).toBe('abc123');
  });

  it('falls back to guest_id from response body when token has no guest_id claim', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiJ0ZXN0In0.' +
      'signature';
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token,
          guest_id: 'fallback-guest'
        }
      }
    });

    const result = await ensureAnonymousSession();
    expect(result).toBe('fallback-guest');
  });

  it('throws when no guest_id can be resolved', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiJ0ZXN0In0.' +
      'signature';
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token,
          guest_id: ''
        }
      }
    });

    await expect(ensureAnonymousSession()).rejects.toThrow(
      'Failed to resolve guest_id'
    );
  });
});
