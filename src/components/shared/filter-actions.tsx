'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  readonly showReset: boolean;
  readonly onReset: () => void;
  readonly onApply: () => void;
};

/**
 *
 */
export default function FilterActions({ showReset, onReset, onApply }: Props) {
  return (
    <>
      {showReset && (
        <Button
          variant='outline'
          size='sm'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'mt-4 w-min border-0 text-[12px]'
          )}
          onClick={onReset}
        >
          Reset Filter
        </Button>
      )}

      <Button
        className='bg-secondary mt-4 rounded-xl p-4 text-white'
        onClick={onApply}
      >
        Terapkan Filter
      </Button>
    </>
  );
}
