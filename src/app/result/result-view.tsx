'use client';

import ScoreDisplay from '@/components/assessment/score-display';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { STORES, dbGetAll } from '@/lib/indexeddb';
import { saveIntent } from '@/utils/redirect-intent';
import type { QuestionnaireResponse } from 'fhir/r4';
import { ClipboardPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
  const { dispatch } = useFab();
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

  const handleClaim = useCallback(() => {
    saveIntent('assessmentResult', { path: '/record', qrId: qrId ?? '' });
    router.push('/auth?redirectToPath=/record');
  }, [qrId, router]);

  // Wire the claim CTA as the transformed action FAB for guests.
  // Action mode suppresses the idle speed-dial, so exactly one FAB shows.
  useEffect(() => {
    const showClaim =
      !authLoading && !loading && !authState.isAuthenticated && qrData;
    if (showClaim) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Claim Results',
          icon: ClipboardPlus,
          variant: 'primary',
          onAction: handleClaim
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }
    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [
    authLoading,
    loading,
    authState.isAuthenticated,
    qrData,
    dispatch,
    handleClaim
  ]);

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
      </div>
    </>
  );
}
