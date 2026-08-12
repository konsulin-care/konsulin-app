'use client';

import { Upload } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';

type Props = {
  /** Current photo URL; undefined renders the initials fallback. */
  photoUrl?: string;
  /** Initials shown when no photo exists. */
  initials: string;
  /** Background color of the initials circle. */
  backgroundColor: string;
  /** Disables the selector while an upload is in flight. */
  isUploading: boolean;
  /** Called with the picked file; upload happens immediately. */
  onFileSelected: (file: File) => void;
};

/**
 * Circular profile photo with an immediate-upload selector.
 *
 * With no photo, renders an initials circle covered by a frost overlay
 * (recommendation-card pattern: `bg-black/50 backdrop-blur-md`) with an
 * Upload icon and "Update Photo" label. Clicking the circle opens the file
 * picker via a hidden input, mirroring the add-location drawer selector.
 */
export default function PhotoUploader({
  photoUrl,
  initials,
  backgroundColor,
  isUploading,
  onFileSelected
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Open the hidden file input. */
  const handleButtonClick = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  /** Forward the picked file and reset the input for repeat picks. */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = '';
  };

  return (
    <div className='relative inline-block'>
      <button
        type='button'
        data-testid='photo-trigger'
        onClick={handleButtonClick}
        disabled={isUploading}
        aria-label='Update Photo'
        className='relative block h-[96px] w-[96px] cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-md'
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt='Profile photo'
            fill
            className='object-cover'
            sizes='96px'
          />
        ) : (
          <>
            <div
              className='flex h-full w-full items-center justify-center text-2xl font-bold text-white'
              style={{ backgroundColor }}
            >
              {initials}
            </div>
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 backdrop-blur-md'>
              <Upload
                className='h-4 w-4 text-white'
                data-testid='upload-icon'
              />
              <span className='text-[10px] font-semibold text-white'>
                Update Photo
              </span>
            </div>
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        data-testid='photo-input'
        onChange={handleFileChange}
      />
    </div>
  );
}
