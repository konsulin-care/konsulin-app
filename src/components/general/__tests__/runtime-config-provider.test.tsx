import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RuntimeConfigProvider,
  useRuntimeConfig
} from '../runtime-config-provider';

function Probe() {
  const { konsulinOrganizationId } = useRuntimeConfig();
  return <div data-testid='org'>{konsulinOrganizationId}</div>;
}

describe('RuntimeConfigProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes konsulinOrganizationId from /api/config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            APP_NAME: 'a',
            API_URL: 'b',
            APP_URL: 'c',
            API_BASE_PATH: '/api',
            AUTH_PATH: '/auth',
            KONSULIN_ORGANIZATION_ID: 'org-1'
          })
      })
    );
    render(
      <RuntimeConfigProvider>
        <Probe />
      </RuntimeConfigProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('org').textContent).toBe('org-1')
    );
  });

  it("falls back to '' when /api/config fails", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <RuntimeConfigProvider>
        <Probe />
      </RuntimeConfigProvider>
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByTestId('org').textContent).toBe('');
  });
});
