import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'en' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      id: {
        update_photo: 'Perbarui Foto',
        profile_photo: 'Foto profil',
        edit_name: 'Ubah nama'
      },
      en: {
        update_photo: 'Update Photo',
        profile_photo: 'Profile photo',
        edit_name: 'Edit name'
      }
    };
    return translations[mockLocale.current]?.[key] ?? key;
  })
}));

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

  beforeEach(() => {
    mockLocale.current = 'en';
  });

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

  it('labels the edit-name control from profile.edit_name under en', () => {
    render(
      <ProfileIdentity
        roleName='Patient'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    expect(screen.getByTestId('edit-name')).toHaveAttribute(
      'aria-label',
      'Edit name'
    );
  });

  it('shows the Indonesian edit-name aria-label under id', () => {
    mockLocale.current = 'id';
    render(
      <ProfileIdentity
        roleName='Patient'
        identity={identity}
        isUploading={false}
        onFileSelected={onFileSelected}
        onEditName={onEditName}
      />
    );
    expect(screen.getByTestId('edit-name')).toHaveAttribute(
      'aria-label',
      'Ubah nama'
    );
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
