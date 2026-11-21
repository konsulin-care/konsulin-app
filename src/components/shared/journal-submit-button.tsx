'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

type Props = {
  readonly isLoading: boolean;
  readonly onClick: () => void;
  readonly label?: string;
};

/**
 *
 */
export default function JournalSubmitButton({
  isLoading,
  onClick,
  label = 'Save Journal'
}: Props) {
  return (
    <Button
      onClick={onClick}
      className='bg-primary text-primary-foreground !mt-auto w-full rounded-full p-4 text-sm'
      disabled={isLoading}
    >
      {isLoading ? (
        <LoadingSpinnerIcon
          width={20}
          height={20}
          stroke='white'
          className='w-full animate-spin'
        />
      ) : (
        label
      )}
    </Button>
  );
}
