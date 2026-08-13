import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/services/auth', () => ({
  fetchCSRFToken: vi.fn()
}));

import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { RoleSwitchDropdown } from '@/components/role-switch-dropdown';

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
