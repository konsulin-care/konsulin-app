import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/general/avatar', () => ({
  default: ({
    initials,
    seed,
    photoUrl
  }: {
    initials?: string;
    seed?: string;
    photoUrl?: string;
  }) => (
    <div
      data-testid='mock-avatar'
      data-initials={initials}
      data-seed={seed}
      data-photo={photoUrl}
    >
      Avatar
    </div>
  )
}));

import { PractitionerInfo } from '../practitioner-info';

describe('PractitionerInfo', () => {
  it('renders practitioner name', () => {
    render(<PractitionerInfo practitionerName='Dr. John Doe' />);
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('does NOT render organization name even when provided (moved to parent)', () => {
    render(
      <PractitionerInfo
        practitionerName='Dr. John Doe'
        practitionerOrganizationName='Konsulin Clinic'
      />
    );
    expect(screen.queryByText('Konsulin Clinic')).not.toBeInTheDocument();
  });

  it('does not render organization name when not provided', () => {
    render(<PractitionerInfo practitionerName='Dr. John Doe' />);
    expect(screen.queryByText('Konsulin Clinic')).not.toBeInTheDocument();
  });

  it('renders avatar with initials', () => {
    render(
      <PractitionerInfo
        practitionerName='Dr. John Doe'
        practitionerAvatar={{ initials: 'JD', backgroundColor: '#000' }}
      />
    );
    const avatar = screen.getByTestId('mock-avatar');
    expect(avatar.dataset.initials).toBe('JD');
  });

  it('derives initials and passes seed from the name as monogram fallback', () => {
    render(<PractitionerInfo practitionerName='Dr. John Doe' />);
    const avatar = screen.getByTestId('mock-avatar');
    expect(avatar.dataset.initials).toBe('JD');
    expect(avatar.dataset.seed).toBe('Dr. John Doe');
  });

  it('passes photoUrl through when provided', () => {
    render(
      <PractitionerInfo
        practitionerName='Dr. John Doe'
        practitionerAvatar={{
          photoUrl: 'https://example.com/photo.jpg'
        }}
      />
    );
    const avatar = screen.getByTestId('mock-avatar');
    expect(avatar.dataset.photo).toBe('https://example.com/photo.jpg');
  });

  it('hides the identity block when no name is available', () => {
    const { container } = render(<PractitionerInfo />);
    expect(screen.queryByTestId('mock-avatar')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });
});
