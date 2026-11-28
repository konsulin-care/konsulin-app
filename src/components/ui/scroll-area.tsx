'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { useScrollEdges } from '@/hooks/useScrollEdges';
import { cn } from '@/lib/utils';

/** Props accepted by the {@link ScrollArea} root. */
type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
>;

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, type = 'scroll', ...props }, ref) => {
  const { ref: viewportRef, attributes } = useScrollEdges<HTMLDivElement>();

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      type={type}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        {...attributes}
        className='h-full w-full rounded-[inherit]'
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none transition-colors select-none',
      orientation === 'vertical' && 'h-full w-[3px]',
      orientation === 'horizontal' && 'h-[3px] flex-col',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className='bg-charcoal-400/50 relative flex-1 rounded-full' />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
