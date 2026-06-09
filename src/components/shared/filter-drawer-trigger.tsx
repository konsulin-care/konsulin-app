'use client';

import { FilterIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  readonly onClick: () => void;
};

/**
 *
 */
export default function FilterDrawerTrigger({ onClick }: Props) {
  return (
    <Button
      onClick={onClick}
      variant='outline'
      className={cn(
        'flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
      )}
    >
      <FilterIcon
        width={20}
        height={20}
        className='min-h-[20px] min-w-[20px]'
        fill='#13c2c2'
      />
    </Button>
  );
}
