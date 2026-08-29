import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush })
}));

vi.mock('@/services/auth', () => ({
  fetchCSRFToken: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() }
}));

import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { RoleSwitchDropdown } from '@/components/role-switch-dropdown';
import { fetchCSRFToken } from '@/services/auth';

const baseAvatar: AvatarInfo = {
  seed: '',
  initials: 'JD',
  backgroundColor: '#13c2c2',
  photoUrl: ''
};

describe('RoleSwitchDropdown', () => {
  it('renders the stacked background circle for 2+ roles', () => {
    render(
      <RoleSwitchDropdown
        otherRoles={['Practitioner']}
        currentAvatar={baseAvatar}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByTestId('stack-bg-circle')).toBeInTheDocument();
  });

  it('hides the stacked background circle for a single role', () => {
    render(
      <RoleSwitchDropdown
        otherRoles={[]}
        currentAvatar={baseAvatar}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('stack-bg-circle')).toBeNull();
  });

  it('lists each other role as icon + label with no avatar image', async () => {
    render(
      <RoleSwitchDropdown
        otherRoles={['Practitioner', 'Clinic Admin']}
        currentAvatar={baseAvatar}
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByText('JD'));
    fireEvent.click(screen.getByText('JD'));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Practitioner')).toBeInTheDocument();
    expect(within(menu).getByText('Clinic Admin')).toBeInTheDocument();
    expect(within(menu).queryByRole('img')).toBeNull();
    expect(within(menu).queryByAltText('practitioner')).toBeNull();
  });
});

/** Opens the dropdown and clicks the given role's switch item. */
async function clickRoleSwitch(role: string) {
  render(
    <RoleSwitchDropdown
      otherRoles={['Practitioner']}
      currentAvatar={baseAvatar}
      onOpenChange={vi.fn()}
    />
  );
  fireEvent.pointerDown(screen.getByText('JD'));
  fireEvent.click(screen.getByText('JD'));
  const menu = await screen.findByRole('menu');
  fireEvent.click(within(menu).getByText(role));
}

describe('RoleSwitchDropdown switchRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCSRFToken).mockResolvedValue('csrf-1');
  });

  it('shows an error toast and does not reload when the switch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await clickRoleSwitch('Practitioner');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('switch')
      )
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/auth/role/switch',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows an error toast when the request throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    await clickRoleSwitch('Practitioner');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('switch')
      )
    );
  });

  it('reloads to the root on a successful switch without a toast', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    await clickRoleSwitch('Practitioner');

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/'));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
