/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies before imports
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: vi.fn()
}));

vi.mock('@/utils/redirect-intent', () => ({
  getIntent: vi.fn(),
  getRedirectIntent: vi.fn(),
  clearIntent: vi.fn(),
  clearRedirectIntent: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbGetAll: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

import { STORES, dbDelete, dbGetAll } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { clearIntent, getIntent } from '@/utils/redirect-intent';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useRedirectIntent } from '../useRedirectIntent';

function TestHarness({
  isLoading,
  authState
}: {
  isLoading: boolean;
  authState: Record<string, unknown>;
}) {
  useRedirectIntent({ isLoading, authState });
  return null;
}

describe('useRedirectIntent cleanup after claim', () => {
  const mockPush = vi.fn();
  const mockPatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn()
    } as any);

    vi.mocked(getIntent).mockReturnValue(null);
    vi.mocked(getAPI).mockResolvedValue({
      patch: mockPatch
    } as any);
    vi.mocked(dbGetAll).mockResolvedValue([]);
  });

  it('deletes assessment draft when qrId is in intent payload', async () => {
    const mockDrafts = [
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: { id: 'qr-123', resourceType: 'QuestionnaireResponse' },
        updatedAt: Date.now()
      }
    ];
    vi.mocked(dbGetAll).mockResolvedValue(mockDrafts);
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    // Wait for effects to settle
    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(dbDelete).toHaveBeenCalledWith(STORES.assessmentDrafts, [
        'guest-1',
        'Questionnaire/test'
      ]);
    });
  });

  it('does not delete any draft when payload has no qrId', async () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(dbDelete).not.toHaveBeenCalled();
    });
  });

  it('does not delete draft when no match found in IndexedDB', async () => {
    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: { id: 'qr-456', resourceType: 'QuestionnaireResponse' },
        updatedAt: Date.now()
      }
    ]);
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' }, // Different ID
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(dbDelete).not.toHaveBeenCalled();
    });
  });

  it('clears intent after successful claim and cleanup', async () => {
    const mockDrafts = [
      {
        ownerId: 'guest-1',
        questionnaireId: 'Questionnaire/test',
        response: { id: 'qr-123', resourceType: 'QuestionnaireResponse' },
        updatedAt: Date.now()
      }
    ];
    vi.mocked(dbGetAll).mockResolvedValue(mockDrafts);
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPatch).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(clearIntent).toHaveBeenCalled();
    });
  });

  it('navigates to /record after claiming', async () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/record');
    });
  });

  it('shows success toast after claiming', async () => {
    vi.mocked(getIntent).mockReturnValue({
      kind: 'assessmentResult',
      payload: { path: '/record', qrId: 'qr-123' },
      createdAt: Date.now()
    });

    render(
      <TestHarness isLoading={false} authState={{ isAuthenticated: true }} />
    );

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
