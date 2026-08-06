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
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Drawers currently open, keyed by instance id → close callback. Powers the
 * app-wide one-open-at-a-time rule: opening a drawer permanently closes any
 * other drawer that is already open.
 */
const openDrawers = new Map<string, () => void>();

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
  // Instance identity for the open-drawer registry (unique per mount).
  const instanceId = useId();
  const wasOpen = useRef(open);
  // Latest onClose, read by the registry at call time so the register
  // effect never has to re-run (and re-clean) on identity changes.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep this drawer's close callback registered while it is open. Deps
  // exclude onClose so re-renders do not delete and re-add the entry.
  useEffect(() => {
    if (open) {
      openDrawers.set(instanceId, () => onCloseRef.current());
    } else {
      openDrawers.delete(instanceId);
    }
    return () => {
      openDrawers.delete(instanceId);
    };
  }, [instanceId, open]);

  // On a fresh open (false→true only), permanently close every other drawer.
  // Deps deliberately exclude onClose so re-renders never re-trigger this.
  useEffect(() => {
    if (open && !wasOpen.current) {
      for (const [otherId, closeOther] of openDrawers) {
        if (otherId !== instanceId) closeOther();
      }
    }
    wasOpen.current = open;
  }, [instanceId, open]);

  return (
    <Drawer
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent
        data-open={open}
        className={cn('mx-auto max-w-screen-sm', className)}
      >
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
