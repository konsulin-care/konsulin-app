import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/admin-api', () => ({
  adminRequest: vi.fn(),
  clearAdminKey: vi.fn(),
  setAdminKey: vi.fn(),
  parseAdminKeyError: vi.fn((_err: unknown) => `Error: ${_err}`)
}));

vi.mock('@/lib/admin/session', () => ({
  clearKeyFlag: vi.fn(),
  isKeySet: vi.fn(),
  markKeySet: vi.fn(),
  KEY_SET_FLAG: 'konsulin_admin_key_set'
}));

import { AdminKeyGate } from '@/components/admin/admin-key-gate';
import { markKeySet } from '@/lib/admin/session';
import { setAdminKey } from '@/services/admin-api';

describe('AdminKeyGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a key input and submit button', () => {
    render(<AdminKeyGate />);
    expect(screen.getByLabelText(/api key/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /unlock/i })).toBeDefined();
  });

  it('submits the key via setAdminKey and marks the session on success', async () => {
    vi.mocked(setAdminKey).mockResolvedValue();
    render(<AdminKeyGate />);

    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: 'sa-secret' }
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

    await waitFor(() => {
      expect(setAdminKey).toHaveBeenCalledWith('sa-secret');
      expect(markKeySet).toHaveBeenCalledTimes(1);
    });
  });

  it('does not mark the session when the backend rejects the key', async () => {
    vi.mocked(setAdminKey).mockRejectedValue(new Error('401'));
    render(<AdminKeyGate />);

    fireEvent.change(screen.getByLabelText(/api key/i), {
      target: { value: 'wrong-key' }
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

    await waitFor(() => {
      expect(markKeySet).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/Error:/)).toBeDefined();
  });

  it('does not submit an empty key', () => {
    render(<AdminKeyGate />);
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    expect(setAdminKey).not.toHaveBeenCalled();
  });
});
