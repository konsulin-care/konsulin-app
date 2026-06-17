'use client';

import { LoadingSpinnerIcon } from '@/components/icons';

type Props = {
  readonly isValid: boolean;
  readonly isUpdateLoading: boolean;
  readonly isUploadingPhoto: boolean;
  readonly onSave: () => void;
};

/** Save button for edit profile form. Shows loading state when saving. */
export function EditProfileSaveButton({
  isValid,
  isUpdateLoading,
  isUploadingPhoto,
  onSave
}: Props) {
  const isLoading = isUpdateLoading || isUploadingPhoto;

  return (
    <button
      className={`text-md border-primary mt-6 w-full rounded-full border-1 p-4 font-semibold ${isValid && !isLoading ? 'bg-secondary text-white' : 'cursor-not-allowed bg-gray-300 text-gray-500'}`}
      type='submit'
      onClick={onSave}
      disabled={!isValid || isLoading}
    >
      {isLoading ? (
        <LoadingSpinnerIcon
          width={20}
          height={20}
          className='w-full animate-spin'
        />
      ) : (
        'Simpan'
      )}
    </button>
  );
}
