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
      <Button
        onClick={onSave}
        disabled={!hasChanges || isSaving}
        className='bg-secondary hover:bg-secondary/90 h-12 rounded-full px-6 text-white shadow-lg'
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
