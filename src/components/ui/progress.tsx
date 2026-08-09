'use client';
/* eslint-disable sonarjs/no-commented-code */

// skipcq: JS-C1003 - radix namespace convention shared by all ui/ components
import * as ProgressPrimitive from '@radix-ui/react-progress';
// skipcq: JS-C1003 - react namespace convention shared by all ui/ components
import * as React from 'react';

import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, color, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value == null ? null : value * 100}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-white',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className='h-full w-full flex-1 transition-all'
      // style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      style={{
        width: `${(value || 0) * 100}%`,
        backgroundColor: color || 'var(--secondary)'
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
