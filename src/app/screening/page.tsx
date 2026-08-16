'use client';

import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getScreeningAnswers,
  resolveSpecialtyFromAnswer,
  SCREENING_QUESTION
} from '@/utils/screening';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

/**
 * One-question triage screening launched from the "Get Recommendation" FAB.
 *
 * Answering deterministically resolves a specialty and navigates to
 * `/recommendation?specialty=…` where the BFF renders ranked cards.
 */
export default function ScreeningPage() {
  const router = useRouter();
  const answers = useMemo(() => getScreeningAnswers(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(false);

  /** Resolve the answer to a specialty and move to results. */
  const handleSubmit = () => {
    const specialty = resolveSpecialtyFromAnswer(selected);
    if (!specialty) {
      setError(true);
      return;
    }
    router.replace(
      `/recommendation?specialty=${encodeURIComponent(specialty)}`
    );
  };

  return (
    <>
      <PageHeader pageIndicator='Rekomendasi' backRoute='/' />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <h1 className='text-lg font-semibold'>{SCREENING_QUESTION}</h1>
        <p className='text-muted mt-1 text-sm'>
          Pilih satu jawaban yang paling sesuai dengan kondisi Anda.
        </p>

        <div className='mt-4 flex flex-col gap-2'>
          {answers.map(answer => (
            <button
              key={answer.code}
              type='button'
              onClick={() => {
                setSelected(answer.code);
                setError(false);
              }}
              className={cn(
                'rounded-xl border p-4 text-left text-sm transition-colors',
                selected === answer.code
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/40'
              )}
              aria-pressed={selected === answer.code}
            >
              {answer.label}
            </button>
          ))}
        </div>

        {error && (
          <p className='mt-3 text-sm text-red-600'>
            Silakan pilih salah satu pilihan terlebih dahulu.
          </p>
        )}

        <Button
          className='mt-6 w-full'
          disabled={selected === null}
          onClick={handleSubmit}
        >
          Lihat Rekomendasi
        </Button>
      </div>
    </>
  );
}
