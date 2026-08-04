'use client';

import type { StudyProgress } from '@/utils/fhir/research';
import { Check } from 'lucide-react';

/** Horizontal strip of batch chips for a single study. */
function TimelineStrip({ progress }: Readonly<{ progress: StudyProgress }>) {
  const noun = progress.consecutiveBatches === 1 ? 'batch' : 'batches';
  return (
    <div>
      <div className='flex items-center gap-2'>
        {progress.history.map((entry, index) => {
          const isCurrent = progress.currentBatch?.id === entry.batchId;
          const isDone = entry.participated && !isCurrent;

          let chipClass = 'bg-gray-100 text-gray-400';
          let content: React.ReactNode = `B${index + 1}`;
          if (isCurrent) {
            chipClass =
              'ring-primary bg-primary text-white ring-2 ring-offset-2';
            content = '●';
          } else if (isDone) {
            chipClass = 'bg-secondary text-white';
            content = <Check className='h-4 w-4' />;
          }

          return (
            <div
              key={entry.batchId}
              data-testid={`batch-chip-${entry.batchId}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${chipClass}`}
            >
              {content}
            </div>
          );
        })}
      </div>
      <p className='mt-2 text-[11px] text-gray-500'>
        You&apos;ve completed {progress.consecutiveBatches} {noun} in a row.
      </p>
    </div>
  );
}

/** Batch timeline strips across all studies. */
export default function BatchTimeline({
  studies
}: Readonly<{ studies: StudyProgress[] }>) {
  return (
    <section className='card mt-4 border-0 bg-[#F9F9F9] p-4'>
      <h2 className='mb-2 text-sm font-bold text-gray-700'>Batch timeline</h2>
      <div className='flex flex-col gap-3'>
        {studies.map(progress => (
          <TimelineStrip key={progress.study.id} progress={progress} />
        ))}
      </div>
    </section>
  );
}
