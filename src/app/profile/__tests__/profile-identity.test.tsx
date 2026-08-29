import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', async () => {
  const { createNextImageMock } = await import('@/__tests__/mocks/next-image');
  return createNextImageMock();
});

import type { ProfileIdentity as Identity } from '../hooks/useProfileData';
import ProfileIdentity from '../profile-identity';

const identity: Identity = {
  photoUrl: undefined,
  initials: 'JD',
  backgroundColor: '#13c2c2',
  seed: 'seed-1',
  displayName: 'John Magnificent Doe',
  given: ['John', 'Magnificent'],
  family: 'Doe'
};

describe('ProfileIdentity', () => {
  const onFileSelected = vi.fn();
  const onEditName = vi.fn();

  it('renders the active role badge', () => {
    render(
      <ProfileIdentity
        roleName='Clinic Admin'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    expect(screen.getByTestId('role-badge').textContent).toBe('Clinic Admin');
  });

  it('renders the collapsed display name', () => {
    render(
      <ProfileIdentity
        roleName='Patient'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    expect(screen.getByTestId('display-name').textContent).toBe(
      'John Magnificent Doe'
    );
  });

  it('opens the name editor when the pencil is clicked', () => {
    render(
      <ProfileIdentity
        roleName='Patient'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    fireEvent.click(screen.getByTestId('edit-name'));
    expect(onEditName).toHaveBeenCalled();
  });

  it('renders the initials fallback when no photo exists', () => {
    render(
      <ProfileIdentity
        roleName='Practitioner'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    expect(screen.getByText('Update Photo')).toBeDefined();
  });

  it('forwards photo uploads to the caller', () => {
    render(
      <ProfileIdentity
        roleName='Patient'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] }
    });
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
