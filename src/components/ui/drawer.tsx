'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
Drawer.displayName = 'Drawer';

/**
 * The DOM node of the currently-open drawer content, or null when outside
 * a drawer. Popovers (comboboxes) rendered inside a drawer portal into this
 * node so they participate in the drawer's modal interaction model instead
 * of losing pointer events to Radix's modal Dialog layer.
 */
const DrawerContentContext = React.createContext<HTMLElement | null>(null);

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    /**
     * Visually hide the modal overlay instead of unmounting it (e.g. while a
     * nested sheet has taken over). Keeping the node mounted preserves the
     * portal DOM order, so a restore can never land above the drawer content.
     */
    hideOverlay?: boolean;
  }
>(({ className, children, hideOverlay = false, ...props }, ref) => {
  const [contentNode, setContentNode] = React.useState<HTMLElement | null>(
    null
  );
  /** Compose the forwarded ref with a capture of the content node. */
  const composeRefs = React.useCallback(
    (node: React.ComponentRef<typeof DrawerPrimitive.Content> | null) => {
      if (node) setContentNode(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );
  return (
    <DrawerPortal>
      <DrawerOverlay className={hideOverlay ? 'invisible' : undefined} />
      <DrawerPrimitive.Content
        ref={composeRefs}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto mt-24 flex max-h-[85dvh] w-full max-w-screen-sm flex-col rounded-t-[10px] border bg-white',
          className
        )}
        {...props}
      >
        <div className='bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full' />
        <div className='flex-1 overflow-y-auto'>
          <DrawerContentContext.Provider value={contentNode}>
            {children}
          </DrawerContentContext.Provider>
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 p-4 text-center', className)} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 p-4', className)}
    {...props}
  />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg leading-none font-semibold tracking-tight',
      className
    )}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerContentContext,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger
};
