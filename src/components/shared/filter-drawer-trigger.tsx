'use client';

import { FilterIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';

type Props = {
  readonly onClick: () => void;
};

/** Trigger button for opening the filter drawer. */
const FilterDrawerTrigger = React.forwardRef<HTMLButtonElement, Props>(
  ({ onClick }, ref) => {
    return (
      <Button
        ref={ref}
        onClick={onClick}
        variant='outline'
        className={cn(
          'bg-muted flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0'
        )}
      >
        <FilterIcon
          width={20}
          height={20}
          className='text-turquoise-deep min-h-[20px] min-w-[20px]'
        />
      </Button>
    );
  }
);
FilterDrawerTrigger.displayName = 'FilterDrawerTrigger';

export default FilterDrawerTrigger;
