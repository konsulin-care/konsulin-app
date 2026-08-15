import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RouteResponseCleaner from '../route-response-cleaner';

const { mockPathname, mockSearchParams, mockCursorDeleteAll, mockDbGet } =
  vi.hoisted(() => ({
    mockPathname: vi.fn<() => string>(),
    mockSearchParams: vi.fn<() => URLSearchParams>(),
    mockCursorDeleteAll: vi.fn<
      (store: unknown, predicate: unknown) => Promise<void>
    >(() => Promise.resolve()),
    mockDbGet: vi.fn()
  }));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    assessmentDrafts: 'assessment_drafts',
    soapDrafts: 'soap_drafts',
    uiPreferences: 'ui_preferences'
  },
  cursorDeleteAll: mockCursorDeleteAll,
  dbGet: mockDbGet
}));

/** The assessment-drafts deletion predicate captured by cursorDeleteAll. */
function draftPredicate(): (value: unknown, key: unknown) => boolean {
  const call = mockCursorDeleteAll.mock.calls.find(
    ([store]) => store === 'assessment_drafts'
  );
  return call?.[1] as (value: unknown, key: unknown) => boolean;
}

describe('RouteResponseCleaner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
    mockSearchParams.mockReturnValue(new URLSearchParams());
    mockDbGet.mockResolvedValue(null);
  });

  it('keeps assessment drafts on the report page', async () => {
    mockPathname.mockReturnValue('/report');
    mockSearchParams.mockReturnValue(new URLSearchParams({ id: 'research' }));

    render(<RouteResponseCleaner />);

    await waitFor(() => expect(mockCursorDeleteAll).toHaveBeenCalled());
    expect(draftPredicate()({}, ['', 'phq2'])).toBe(false);
  });

  it('deletes assessment drafts on non-exempt pages', async () => {
    render(<RouteResponseCleaner />);

    await waitFor(() => expect(mockCursorDeleteAll).toHaveBeenCalled());
    expect(draftPredicate()({}, ['', 'phq2'])).toBe(true);
  });

  it('respects the skip-response-cleanup override on the report page', async () => {
    mockPathname.mockReturnValue('/report');
    mockDbGet.mockResolvedValue({ value: 'true' });

    render(<RouteResponseCleaner />);

    await waitFor(() => expect(mockCursorDeleteAll).toHaveBeenCalled());
    expect(draftPredicate()({}, ['', 'phq2'])).toBe(false);
  });
});
