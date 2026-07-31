'use client';

import ScoreDisplay from '@/components/assessment/score-display';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGetAll } from '@/lib/indexeddb';
import { saveIntent } from '@/utils/redirect-intent';
import type { QuestionnaireResponse } from 'fhir/r4';
import { ClipboardPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Load QR data from IndexedDB drafts by matching response.id. */
async function loadDraftByQrId(
  qrId: string
): Promise<QuestionnaireResponse | null> {
  const drafts = await dbGetAll<{
    ownerId: string;
    questionnaireId: string;
    response: QuestionnaireResponse;
    updatedAt: number;
  }>(STORES.assessmentDrafts);

  const match = drafts.find(d => d.response?.id === qrId);
  return match?.response ?? null;
}

/**
 * Guest-facing assessment result page.
 *
 * Reads a QuestionnaireResponse ID from ?id=, looks up the data in
 * IndexedDB (saved locally after guest submission), and renders
 * the score display with a "Claim Results" CTA for unauthenticated users.
 */
export default function ResultView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: authState, isLoading: authLoading } = useAuth();
  const qrId = searchParams.get('id');

  const [qrData, setQrData] = useState<QuestionnaireResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const data = await loadDraftByQrId(qrId);
        setQrData(data);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    };
    loadData().catch(() => {
      setLoading(false);
    });
  }, [qrId]);

  const handleClaim = () => {
    saveIntent('assessmentResult', { path: '/record', qrId: qrId ?? '' });
    router.push('/auth?redirectToPath=/record');
  };

  // Still loading auth or data — render nothing
  if (authLoading || loading) {
    return null;
  }

  // No QR found — empty state
  if (!qrId || !qrData) {
    return (
      <>
        <PageHeader
          pageIndicator='Assessment Result'
          backRoute='/assessments'
        />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <div className='flex min-h-[300px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>Result not found</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader pageIndicator='Assessment Result' backRoute='/assessments' />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <ScoreDisplay
          questionnaireResponse={qrData}
          isLoading={false}
          resultBrief={null}
        />

        {!authState.isAuthenticated && (
          <div className='fixed right-4 bottom-4 z-50'>
            <Button
              onClick={handleClaim}
              className='flex items-center gap-2 rounded-full px-6 py-3 shadow-lg'
            >
              <ClipboardPlus className='h-5 w-5' />
              Claim Results
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
