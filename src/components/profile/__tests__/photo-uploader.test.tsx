import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', async () => {
  const { createNextImageMock } = await import('@/__tests__/mocks/next-image');
  return createNextImageMock();
});

import PhotoUploader from '../photo-uploader';

describe('PhotoUploader', () => {
  const onFileSelected = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the photo image when photoUrl is provided', () => {
    render(
      <PhotoUploader
        photoUrl='https://cdn.example.com/photo.jpg'
        initials='JD'
        backgroundColor='#13c2c2'
        isUploading={false}
        onFileSelected={onFileSelected}
      />
    );
    expect(screen.getByTestId('next-image')).toBeDefined();
    expect(screen.queryByText('Update Photo')).toBeNull();
  });

  it('renders initials with a frost overlay when no photo exists', () => {
    render(
      <PhotoUploader
        initials='JD'
        backgroundColor='#13c2c2'
        isUploading={false}
        onFileSelected={onFileSelected}
      />
    );
    expect(screen.getByText('JD')).toBeDefined();
    expect(screen.getByText('Update Photo')).toBeDefined();
  });

  it('opens the file picker when the photo is clicked', () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {
        // jsdom cannot open native file dialogs
      });
    render(
      <PhotoUploader
        initials='JD'
        backgroundColor='#13c2c2'
        isUploading={false}
        onFileSelected={onFileSelected}
      />
    );
    fireEvent.click(screen.getByTestId('photo-trigger'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('passes the selected file to the caller', () => {
    render(
      <PhotoUploader
        initials='JD'
        backgroundColor='#13c2c2'
        isUploading={false}
        onFileSelected={onFileSelected}
      />
    );
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] }
    });
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
