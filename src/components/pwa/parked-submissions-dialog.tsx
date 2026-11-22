'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useTranslations } from '@/i18n';
import type { PendingSubmission } from '@/lib/indexeddb';

/** Props for the parked submissions review dialog. */
export interface ParkedSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PendingSubmission[];
  onRetry: (id: string) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

/** Translation lookup shape used by the review helpers. */
type Translate = (key: string) => string;

/** Returns the display label of a queued item, falling back to its questionnaire id. */
function labelOf(item: PendingSubmission): string {
  if (item.label) return item.label;
  const payload = item.payload as { questionnaire?: unknown } | null;
  const questionnaire = payload?.questionnaire;
  if (typeof questionnaire === 'string' && questionnaire.length > 0) {
    return questionnaire.split('/').at(-1) || item.kind;
  }
  return item.kind;
}

/** Formats a timestamp as a local date-time string. */
function formatLocalDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp));
}

/**
 * Maps a parked item's last error to a translated review reason.
 *
 * @param item - Parked submission whose lastError is inspected.
 * @param t - Translation lookup for the pwa namespace.
 * @returns Human-readable reason for the failure.
 */
function reasonOf(item: PendingSubmission, t: Translate): string {
  const status = item.lastError?.status;
  if (status === 400 || status === 422) return t('pwa.reason_invalid');
  if (status === 404) return t('pwa.reason_missing');
  if (item.lastError?.message === 'max-attempts') {
    return t('pwa.reason_max_attempts');
  }
  return t('pwa.reason_generic');
}

/** Props for a single parked submission row. */
interface ParkedRowProps {
  item: PendingSubmission;
  onRetry: (id: string) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

/**
 * Confirmation alert that removes one parked submission after approval.
 *
 * @param props.itemId - Queued submission id to discard.
 * @param props.onDiscard - Callback that removes the queued item.
 */
function DiscardAlert({
  itemId,
  onDiscard
}: {
  itemId: string;
  onDiscard: (id: string) => Promise<void>;
}) {
  const t = useTranslations('common');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type='button'
          className='text-destructive cursor-pointer text-sm font-semibold underline'
        >
          {t('pwa.discard')}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('pwa.discard_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('pwa.discard_description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('pwa.cancel_discard')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              // skipcq: JS-0098 - fire-and-forget discard
              void onDiscard(itemId);
            }}
          >
            {t('pwa.discard_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * One parked submission row with label, date, reason, raw details and actions.
 *
 * @param props.item - Parked submission to display.
 * @param props.onRetry - Callback that retries the item.
 * @param props.onDiscard - Callback that discards the item after confirmation.
 */
function ParkedRow({ item, onRetry, onDiscard }: ParkedRowProps) {
  const t = useTranslations('common');

  return (
    <li className='flex flex-col gap-2 py-3'>
      <div>
        <p className='font-medium'>{labelOf(item)}</p>
        <p className='text-muted-foreground text-xs'>
          {formatLocalDateTime(item.createdAt)}
        </p>
        <p className='text-warning-deep text-sm'>{reasonOf(item, t)}</p>
      </div>
      <details className='text-muted-foreground text-xs'>
        <summary className='cursor-pointer'>{t('pwa.parked_details')}</summary>
        <pre className='mt-1 break-words whitespace-pre-wrap'>
          {item.lastError?.message}
        </pre>
      </details>
      <div className='flex gap-2'>
        <button
          type='button'
          onClick={() => {
            // skipcq: JS-0098 - fire-and-forget manual retry
            void onRetry(item.id);
          }}
          className='text-turquoise-deep cursor-pointer text-sm font-semibold underline'
        >
          {t('pwa.retry')}
        </button>
        <DiscardAlert itemId={item.id} onDiscard={onDiscard} />
      </div>
    </li>
  );
}

/**
 * Dialog listing parked offline submissions for manual review.
 * Each row shows the label, local date-time, mapped failure reason and the
 * raw error in a collapsed details block, with Retry and confirmed Discard.
 */
export default function ParkedSubmissionsDialog({
  open,
  onOpenChange,
  items,
  onRetry,
  onDiscard
}: ParkedSubmissionsDialogProps) {
  const t = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pwa.parked_title')}</DialogTitle>
          <DialogDescription>{t('pwa.parked_description')}</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            {t('pwa.parked_empty')}
          </p>
        ) : (
          <ul className='divide-border flex flex-col divide-y'>
            {items.map(item => (
              <ParkedRow
                key={item.id}
                item={item}
                onRetry={onRetry}
                onDiscard={onDiscard}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
