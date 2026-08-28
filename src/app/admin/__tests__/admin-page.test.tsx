import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/admin-api', () => ({
  adminRequest: vi.fn(),
  clearAdminKey: vi.fn(),
  setAdminKey: vi.fn(),
  parseAdminKeyError: vi.fn(() => 'An unexpected error occurred')
}));

vi.mock('@/lib/admin/session', () => ({
  clearKeyFlag: vi.fn(),
  isKeySet: vi.fn(),
  markKeySet: vi.fn(),
  KEY_SET_FLAG: 'konsulin_admin_key_set'
}));

import AdminPage from '@/app/admin/page';
import { isKeySet, markKeySet } from '@/lib/admin/session';
import { setAdminKey } from '@/services/admin-api';

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the key gate when no key session exists', () => {
    vi.mocked(isKeySet).mockReturnValue(false);
    render(<AdminPage />);
    expect(screen.getByLabelText(/api key/i)).toBeDefined();
    expect(screen.queryByLabelText(/endpoint/i)).toBeNull();
  });

  it('shows the request builder when a key session exists', async () => {
    vi.mocked(isKeySet).mockReturnValue(true);
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint/i)).toBeDefined();
    });
    expect(screen.queryByLabelText(/api key/i)).toBeNull();
  });

  it('switches from gate to builder after unlocking', async () => {
    vi.mocked(isKeySet).mockReturnValue(false);
    vi.mocked(setAdminKey).mockResolvedValue();
    render(<AdminPage />);

    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: 'sa-secret' }
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

    await waitFor(() => {
      expect(markKeySet).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(/endpoint/i)).toBeDefined();
    });
  });
});
