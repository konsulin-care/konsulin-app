'use client';

import { useTranslations } from '@/i18n';
import type { ResearchBatch } from '@/utils/fhir/research';

/** Props of the batch segments bar. */
export interface BatchSegmentsProps {
  /** Study batches in display order. */
  batches: readonly ResearchBatch[];
  /** Reference date, yyyy-mm-dd. */
  today: string;
}

/** Visual state of one batch segment. */
type SegmentState = 'closed' | 'current' | 'upcoming';

const STATE_CLASS: Record<SegmentState, string> = {
  closed: 'bg-charcoal-400',
  current: 'bg-turquoise-deep',
  upcoming: 'bg-charcoal-200'
};

/**
 * Classifies a batch relative to today.
 *
 * @param batch - The batch to classify.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The segment state.
 */
function stateOf(batch: ResearchBatch, today: string): SegmentState {
  if (batch.end < today) return 'closed';
  if (batch.start <= today && today <= batch.end) return 'current';
  return 'upcoming';
}

/**
 * Finds the batch index announced in the wrapper label: the current batch, or
 * the last closed batch when nothing is running.
 *
 * @param batches - Study batches in display order.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns One-based batch index, or 1 when no batch matches.
 */
function labelIndexOf(
  batches: readonly ResearchBatch[],
  today: string
): number {
  const current = batches.findIndex(
    batch => batch.start <= today && today <= batch.end
  );
  if (current !== -1) return current + 1;
  const lastClosed = batches.findLastIndex(batch => batch.end < today);
  return lastClosed === -1 ? 1 : lastClosed + 1;
}

/**
 * Row of equal segments, one per batch, coloured by closed, current or
 * upcoming state.
 *
 * @param props - Batches and the reference date.
 * @returns The batch segments element.
 */
export function BatchSegments({
  batches,
  today
}: Readonly<BatchSegmentsProps>) {
  const t = useTranslations('research');

  return (
    <div
      data-testid='batch-segments'
      aria-label={t('overview.kind_batch', {
        index: labelIndexOf(batches, today),
        total: batches.length
      })}
      className='flex gap-1'
    >
      {batches.map(batch => {
        const state = stateOf(batch, today);
        return (
          <span
            key={batch.id}
            data-state={state}
            className={`h-1.5 flex-1 rounded-full ${STATE_CLASS[state]}`}
          />
        );
      })}
    </div>
  );
}
