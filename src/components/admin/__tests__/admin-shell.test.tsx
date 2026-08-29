import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/admin-api', () => ({
  clearAdminKey: vi.fn(),
  setAdminKey: vi.fn(),
  adminRequest: vi.fn(),
  parseAdminKeyError: vi.fn()
}));

vi.mock('@/lib/admin/session', () => ({
  clearKeyFlag: vi.fn(),
  isKeySet: vi.fn(() => true),
  markKeySet: vi.fn(),
  KEY_SET_FLAG: 'konsulin_admin_key_set'
}));

import { AdminShell } from '@/components/admin/admin-shell';
import { clearKeyFlag } from '@/lib/admin/session';
import { clearAdminKey } from '@/services/admin-api';

const mockReload = vi.fn();

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: mockReload }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title and children', () => {
    render(
      <AdminShell>
        <div>page body</div>
      </AdminShell>
    );
    expect(screen.getByText('Superadmin Console')).toBeDefined();
    expect(screen.getByText('page body')).toBeDefined();
  });

  it('clears the BFF key cookie and the session flag on lock', async () => {
    render(
      <AdminShell>
        <div>page body</div>
      </AdminShell>
    );
    fireEvent.click(screen.getByRole('button', { name: /lock/i }));

    await waitFor(() => {
      expect(clearAdminKey).toHaveBeenCalledTimes(1);
      expect(clearKeyFlag).toHaveBeenCalledTimes(1);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });
});
