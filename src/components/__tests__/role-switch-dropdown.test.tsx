import { render, screen } from '@testing-library/react';
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
  it('renders the stacked circles with badge count', () => {
    render(
      <RoleSwitchDropdown
        roles={['patient', 'practitioner']}
        currentAvatar={baseAvatar}
        otherRoleAvatars={[
          {
            seed: '',
            initials: 'PR',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'practitioner'
          }
        ]}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
