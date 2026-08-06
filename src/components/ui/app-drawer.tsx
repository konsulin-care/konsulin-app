'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type AppDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Optional DrawerTrigger slot for trigger-based drawers. */
  trigger?: ReactNode;
  /** Rendered inside the standardized DrawerHeader/DrawerTitle. */
  title?: ReactNode;
  /** Rendered inside the standardized DrawerHeader/DrawerDescription. */
  description?: ReactNode;
  /** Scrollable body content. */
  children?: ReactNode;
  /** Single CTA label; omit together with onCtaClick for a footerless drawer. */
  ctaLabel?: string;
  /** Called when the CTA is clicked; may return a promise. */
  onCtaClick?: () => void | Promise<void>;
  /** Inactive state — disables the CTA button. */
  ctaDisabled?: boolean;
  /** Shows a spinner in place of the CTA label while true. */
  ctaLoading?: boolean;
  /** Optional content rendered under the CTA (e.g., legal footnote). */
  footerContent?: ReactNode;
  /** DrawerContent passthrough (e.g., height override). */
  className?: string;
};

/**
 * Standardized bottom-sheet drawer: max 85dvh, capped at the content
 * column width, with a single sticky CTA footer that stays visible on
 * long content. Dismissal is outside-click, drag, or Escape only.
 */
export default function AppDrawer({
  open,
  onClose,
  trigger,
  title,
  description,
  children,
  ctaLabel,
  onCtaClick,
  ctaDisabled = false,
  ctaLoading = false,
  footerContent,
  className
}: AppDrawerProps) {
  const hasCta = Boolean(ctaLabel && onCtaClick);

  return (
    <Drawer
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className={cn('mx-auto max-w-screen-sm', className)}>
        <div className='flex min-h-full flex-col'>
          {(title || description) && (
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
            </DrawerHeader>
          )}
          <div className='flex-1'>{children}</div>
          {hasCta && (
            <div className='sticky bottom-0 mt-auto border-t bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]'>
              <Button
                type='button'
                variant='secondary'
                className='w-full rounded-xl py-4 text-white'
                disabled={ctaDisabled || ctaLoading}
                onClick={() => {
                  void onCtaClick?.();
                }}
              >
                {ctaLoading ? (
                  <LoadingSpinnerIcon
                    width={20}
                    height={20}
                    stroke='white'
                    className='animate-spin'
                  />
                ) : (
                  ctaLabel
                )}
              </Button>
              {footerContent}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
