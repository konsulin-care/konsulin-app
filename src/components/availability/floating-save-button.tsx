'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FloatingSaveButtonProps } from '@/types/availability';

export default function FloatingSaveButton({
  isSaving,
  hasChanges,
  onSave,
  onCancel
}: FloatingSaveButtonProps) {
  return (
    <div className='fixed right-6 bottom-6 z-50 flex gap-2'>
      {onCancel && (
        <Button
          onClick={onCancel}
          disabled={isSaving}
          variant='outline'
          className='h-12 rounded-full bg-white px-6 shadow-lg'
          size='lg'
        >
          Cancel
        </Button>
      )}
      <Button
        onClick={onSave}
        disabled={!hasChanges || isSaving}
        className='h-12 rounded-full px-6 shadow-lg'
        size='lg'
      >
        {isSaving ? (
          <>
            <LoadingSpinnerIcon
              stroke='white'
              width={20}
              height={20}
              className='mr-2 animate-spin'
            />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  );
}
