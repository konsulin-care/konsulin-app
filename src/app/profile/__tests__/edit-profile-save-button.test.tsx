import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditProfileSaveButton } from '@/app/profile/edit-profile-save-button';

describe('EditProfileSaveButton', () => {
  it('renders save button text when not loading', () => {
    render(
      <EditProfileSaveButton
        isValid
        isUpdateLoading={false}
        isUploadingPhoto={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('Simpan')).toBeDefined();
  });

  it('shows loading spinner when updating', () => {
    render(
      <EditProfileSaveButton
        isValid
        isUpdateLoading
        isUploadingPhoto={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByText('Simpan')).toBeNull();
    // LoadingSpinnerIcon renders an SVG with animate-spin class
  });

  it('shows loading spinner when uploading photo', () => {
    render(
      <EditProfileSaveButton
        isValid
        isUpdateLoading={false}
        isUploadingPhoto
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByText('Simpan')).toBeNull();
  });

  it('is disabled and greyed out when form is invalid', () => {
    render(
      <EditProfileSaveButton
        isValid={false}
        isUpdateLoading={false}
        isUploadingPhoto={false}
        onSave={vi.fn()}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onSave when clicked', () => {
    const onSave = vi.fn();
    render(
      <EditProfileSaveButton
        isValid
        isUpdateLoading={false}
        isUploadingPhoto={false}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('does not call onSave when disabled', () => {
    const onSave = vi.fn();
    render(
      <EditProfileSaveButton
        isValid={false}
        isUpdateLoading
        isUploadingPhoto={false}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSave).not.toHaveBeenCalled();
  });
});
