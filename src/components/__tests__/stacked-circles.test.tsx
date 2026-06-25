import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      <img
        src={src as string}
        alt={alt as string}
        data-testid='next-image'
        {...props}
      />
    );
  }
}));

import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { StackedCircles } from '@/components/stacked-circles';

const baseAvatar: AvatarInfo = {
  seed: '',
  initials: 'JD',
  backgroundColor: '#13c2c2',
  photoUrl: ''
};

describe('StackedCircles', () => {
  it('renders single avatar with no badge when there are no other roles', () => {
    render(
      <StackedCircles
        roles={['patient']}
        currentAvatar={baseAvatar}
        otherRoleAvatars={[]}
      />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('renders avatar with +1 badge side by side for one other role', () => {
    render(
      <StackedCircles
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
      />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders avatar with +3 badge for three other roles', () => {
    render(
      <StackedCircles
        roles={['patient', 'prac1', 'prac2', 'prac3']}
        currentAvatar={baseAvatar}
        otherRoleAvatars={[
          {
            seed: '',
            initials: 'P1',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'prac1'
          },
          {
            seed: '',
            initials: 'P2',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'prac2'
          },
          {
            seed: '',
            initials: 'P3',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'prac3'
          }
        ]}
      />
    );

    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('caps badge at +9 for readability when more than 9 roles', () => {
    render(
      <StackedCircles
        roles={['patient', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']}
        currentAvatar={baseAvatar}
        otherRoleAvatars={[
          {
            seed: '',
            initials: 'A',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'a'
          },
          {
            seed: '',
            initials: 'B',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'b'
          },
          {
            seed: '',
            initials: 'C',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'c'
          },
          {
            seed: '',
            initials: 'D',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'd'
          },
          {
            seed: '',
            initials: 'E',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'e'
          },
          {
            seed: '',
            initials: 'F',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'f'
          },
          {
            seed: '',
            initials: 'G',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'g'
          },
          {
            seed: '',
            initials: 'H',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'h'
          },
          {
            seed: '',
            initials: 'I',
            backgroundColor: '#fff',
            photoUrl: '',
            role: 'i'
          }
        ]}
      />
    );

    expect(screen.getByText('+9')).toBeInTheDocument();
    expect(screen.queryByText('+10')).not.toBeInTheDocument();
  });

  it('renders badge with teal 80% background alongside the avatar', () => {
    render(
      <StackedCircles
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
      />
    );

    const container = screen.getByText('JD').closest('.inline-flex');
    const badge = screen.getByText('+1');
    expect(container).toContainElement(badge);
    expect(badge).toHaveClass('bg-[#13c2c2]/80');
  });
});
