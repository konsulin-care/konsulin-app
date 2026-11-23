'use client';

import { useTranslations } from '@/i18n';
import type { StudyProgress } from '@/utils/fhir/research';
import {
  batchTimeline,
  type BatchTimelineStatus
} from '@/utils/fhir/research-schedule';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

/** Status shown by one trail node, including the offline sync state. */
type TrailStatus = BatchTimelineStatus | 'syncing';

/** Rendering data for one batch node. */
interface TrailNode {
  batchId: string;
  index: number;
  status: TrailStatus;
}

/**
 * Builds the nodes of the trail: batch dates and participation decide the
 * base status, a complete progress marks the current batch done, and any
 * still-open batch awaiting sync becomes syncing.
 *
 * @param progress - Progress of the rendered study.
 * @param waitingBatchIds - Batches with a queued response.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Trail nodes in start order.
 */
function resolveNodes(
  progress: StudyProgress,
  waitingBatchIds: ReadonlySet<string>,
  today: string
): TrailNode[] {
  const participated = progress.history
    .filter(entry => entry.participated)
    .map(entry => entry.batchId);

  return batchTimeline(progress.batches, participated, today).map(entry => {
    const base: TrailStatus =
      entry.status === 'current' && progress.isComplete ? 'done' : entry.status;
    const status: TrailStatus =
      base !== 'done' && waitingBatchIds.has(entry.batch.id) ? 'syncing' : base;

    return { batchId: entry.batch.id, index: entry.index, status };
  });
}

/**
 * Maps a trail status to the node surface styles.
 *
 * @param status - Status of the node.
 * @returns The class names for the round node.
 */
function nodeClassName(status: TrailStatus): string {
  switch (status) {
    case 'done': {
      return 'bg-accent ring-2 ring-turquoise-deep';
    }
    case 'current': {
      return 'bg-card ring-2 ring-foreground';
    }
    case 'syncing': {
      return 'border-2 border-dashed border-turquoise-deep';
    }
    default: {
      return 'border-2 border-dashed border-charcoal-400';
    }
  }
}

/** One batch node with its round marker and visible status label. */
function TrailNodeItem({ node }: Readonly<{ node: TrailNode }>) {
  const t = useTranslations('research');

  return (
    <li className='flex flex-col items-center gap-1'>
      <div
        data-testid={`batch-chip-${node.batchId}`}
        data-status={node.status}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${nodeClassName(node.status)}`}
      >
        {node.status === 'done' ? (
          <Check className='text-charcoal-700 h-4 w-4' aria-hidden='true' />
        ) : (
          <span>B{node.index}</span>
        )}
      </div>
      <span className='text-muted-foreground text-xs'>
        {t(`trail.status.${node.status}`)}
      </span>
    </li>
  );
}

/**
 * Batch trail of a study: one round node per batch with its status label.
 *
 * @param progress - Progress of the rendered study.
 * @param waitingBatchIds - Batches with a queued response awaiting sync.
 * @param today - Reference date, yyyy-mm-dd.
 */
export default function BatchTrail({
  progress,
  waitingBatchIds = new Set<string>(),
  today = format(new Date(), 'yyyy-MM-dd')
}: Readonly<{
  progress: StudyProgress;
  waitingBatchIds?: ReadonlySet<string>;
  today?: string;
}>) {
  const t = useTranslations('research');
  const nodes = resolveNodes(progress, waitingBatchIds, today);
  const summary = nodes
    .map(node =>
      t('trail.node', {
        index: node.index,
        status: t(`trail.status.${node.status}`)
      })
    )
    .join(', ');

  return (
    <ol
      aria-label={t('trail.aria', { summary })}
      className='flex items-start gap-2'
    >
      {nodes.map(node => (
        <TrailNodeItem key={node.batchId} node={node} />
      ))}
    </ol>
  );
}
