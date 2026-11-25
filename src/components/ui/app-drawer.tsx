'use client';

import AppDrawerDialog, {
  DrawerFooterBlock
} from '@/components/ui/app-drawer-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

/**
 * Drawers currently open, keyed by instance id → close callback. Powers the
 * app-wide one-open-at-a-time rule: opening a drawer permanently closes any
 * other drawer that is already open.
 */
const openDrawers = new Map<string, () => void>();

/** Host drawer controls exposed to nested sheets (e.g. mobile comboboxes). */
export type AppDrawerHost = {
  /** Visually hide the drawer (slide down) while keeping children mounted. */
  suspend: () => void;
  /** Restore a suspended drawer to its visible state. */
  resume: () => void;
};

/** Fallback for nested sheets rendered outside an AppDrawer. */
const NOOP_HOST: AppDrawerHost = {
  suspend: (): void => undefined,
  resume: (): void => undefined
};

const AppDrawerHostContext = createContext<AppDrawerHost>(NOOP_HOST);

/**
 * Lets a nested sheet temporarily take over the drawer's screen real estate
 * without unmounting its body state. No-op outside an AppDrawer.
 */
export function useAppDrawerHost(): AppDrawerHost {
  return useContext(AppDrawerHostContext);
}

/** Optional title/description row rendered inside the standardized DrawerHeader. */
function DrawerHeaderBlock({
  title,
  description
}: Readonly<{ title?: ReactNode; description?: ReactNode }>) {
  return (
    <DrawerHeader>
      {title && <DrawerTitle>{title}</DrawerTitle>}
      {description && <DrawerDescription>{description}</DrawerDescription>}
    </DrawerHeader>
  );
}

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
}: Readonly<AppDrawerProps>) {
  const hasCta = Boolean(ctaLabel && onCtaClick);
  // Tablets and up render a centred dialog instead of the bottom sheet.
  const isDialogMode = useMediaQuery('(min-width: 768px)');
  // Instance identity for the open-drawer registry (unique per mount).
  const instanceId = useId();
  const wasOpen = useRef(open);
  // Latest onClose, read by the registry at call time so the register
  // effect never has to re-run (and re-clean) on identity changes.
  const onCloseRef = useRef(onClose);
  // Hidden while a nested sheet (e.g. a mobile combobox sheet) is open on
  // top; children stay mounted so their state survives the round trip.
  const [suspended, setSuspended] = useState(false);
  const host = useMemo<AppDrawerHost>(
    () => ({
      suspend: () => {
        setSuspended(true);
      },
      resume: () => {
        setSuspended(false);
      }
    }),
    []
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep this drawer's close callback registered while it is open. Deps
  // exclude onClose so re-renders do not delete and re-add the entry.
  useEffect(() => {
    if (open) {
      openDrawers.set(instanceId, () => {
        onCloseRef.current();
      });
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

  // Suspension only makes sense while the drawer is open; a real close must
  // never leave a stale hidden state on the next open.
  useEffect(() => {
    if (!open) setSuspended(false);
  }, [open]);

  if (isDialogMode) {
    return (
      <AppDrawerDialog
        open={open}
        onClose={onClose}
        trigger={trigger}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onCtaClick={onCtaClick}
        ctaDisabled={ctaDisabled}
        ctaLoading={ctaLoading}
        footerContent={footerContent}
        className={className}
      >
        <AppDrawerHostContext.Provider value={host}>
          {children}
        </AppDrawerHostContext.Provider>
      </AppDrawerDialog>
    );
  }

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
        data-suspended={suspended}
        hideOverlay={suspended}
        className={cn(
          'mx-auto max-w-screen-sm',
          suspended && 'pointer-events-none translate-y-full',
          className
        )}
      >
        {(title || description) && (
          <DrawerHeaderBlock title={title} description={description} />
        )}
        <div className='flex-1 px-4 pb-4'>
          <AppDrawerHostContext.Provider value={host}>
            {children}
          </AppDrawerHostContext.Provider>
        </div>
        {hasCta && (
          <DrawerFooterBlock
            ctaLabel={ctaLabel}
            onCtaClick={onCtaClick}
            ctaDisabled={ctaDisabled}
            ctaLoading={ctaLoading}
            footerContent={footerContent}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
