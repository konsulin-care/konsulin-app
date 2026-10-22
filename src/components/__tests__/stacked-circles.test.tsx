import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
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
  it('renders single avatar with no stack when there are no other roles', () => {
    render(
      <StackedCircles currentAvatar={baseAvatar} hasMultipleRoles={false} />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.queryByTestId('stack-bg-circle')).not.toBeInTheDocument();
  });

  it('renders two stacked circles for 2+ roles (avatar on top, bg behind)', () => {
    render(<StackedCircles currentAvatar={baseAvatar} hasMultipleRoles />);

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByTestId('stack-bg-circle')).toBeInTheDocument();
  });

  it('positions the background circle 8px right of the avatar', () => {
    render(<StackedCircles currentAvatar={baseAvatar} hasMultipleRoles />);

    const bg = screen.getByTestId('stack-bg-circle');
    expect(bg).toHaveStyle('left: 8px');
  });

  it('applies teal-grey gradient and 80% opacity to the background circle', () => {
    render(<StackedCircles currentAvatar={baseAvatar} hasMultipleRoles />);

    const bg = screen.getByTestId('stack-bg-circle');
    expect(bg).toHaveClass('opacity-80');
    expect(bg).toHaveClass('bg-gradient-to-br');
  });
});
