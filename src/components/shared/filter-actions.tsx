'use client';

import { Button } from '@/components/ui/button';

type Props = {
  readonly showReset: boolean;
  readonly onReset: () => void;
};

/**
 * Inline reset link for filter drawers. The apply action lives in the
 * drawer's footer CTA (AppDrawer), not here.
 */
export default function FilterActions({ showReset, onReset }: Props) {
  if (!showReset) return null;
  return (
    <Button
      variant='outline'
      size='sm'
      className='mt-4 w-min border-0 text-[12px]'
      onClick={onReset}
    >
      Reset Filter
    </Button>
  );
}
