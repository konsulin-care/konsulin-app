'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Props shared by the drawer's bottom-sheet and dialog presentations. */
export interface AppDrawerContentProps {
  /** Whether the surface is currently visible. */
  open: boolean;
  /** Called when the user dismisses the surface. */
  onClose: () => void;
  /** Optional trigger element rendered via `asChild`. */
  trigger?: ReactNode;
  /** Header title. */
  title?: ReactNode;
  /** Header description. */
  description?: ReactNode;
  /** Scrollable body content. */
  children?: ReactNode;
  /** Single CTA label. */
  ctaLabel?: string;
  /** Called when the CTA is clicked; may return a promise. */
  onCtaClick?: () => void | Promise<void>;
  /** Inactive state — disables the CTA button. */
  ctaDisabled?: boolean;
  /** Shows a spinner in place of the CTA label while true. */
  ctaLoading?: boolean;
  /** Optional content rendered under the CTA. */
  footerContent?: ReactNode;
  /** Extra classes forwarded to the dialog content. */
  className?: string;
}

/**
 * Sticky CTA footer with the single action button and optional footnote.
 *
 * @param props - CTA label, click handler, disabled/loading flags and footer slot.
 * @returns The footer block element.
 */
export function DrawerFooterBlock({
  ctaLabel,
  onCtaClick,
  ctaDisabled,
  ctaLoading,
  footerContent
}: Readonly<{
  ctaLabel?: ReactNode;
  onCtaClick?: () => void | Promise<void>;
  ctaDisabled: boolean;
  ctaLoading: boolean;
  footerContent?: ReactNode;
}>) {
  return (
    <div className='bg-card sticky bottom-0 mt-auto border-t p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]'>
      <Button
        type='button'
        size='lg'
        className='w-full'
        disabled={ctaDisabled || ctaLoading}
        onClick={() => {
          // skipcq: JS-0098 - fire-and-forget CTA action
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
  );
}

/**
 * Tablets and up (>= 768px) presentation of an app drawer: a centred Radix
 * dialog with the same header, scrollable body and sticky CTA footer.
 *
 * @param props - Drawer content props (see `AppDrawerContentProps`).
 * @returns The dialog-based drawer surface.
 */
export default function AppDrawerDialog({
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
}: Readonly<AppDrawerContentProps>) {
  const hasCta = Boolean(ctaLabel && onCtaClick);
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        data-open={open}
        className={cn(
          'flex max-h-[85dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 md:left-[calc(50%+var(--shell-offset,0px)/2)]',
          className
        )}
      >
        {(title || description) && (
          <DialogHeader className='p-4 pb-0'>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className='flex-1 overflow-y-auto px-4 pb-4'>{children}</div>
        {hasCta && (
          <DrawerFooterBlock
            ctaLabel={ctaLabel}
            onCtaClick={onCtaClick}
            ctaDisabled={ctaDisabled}
            ctaLoading={ctaLoading}
            footerContent={footerContent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
