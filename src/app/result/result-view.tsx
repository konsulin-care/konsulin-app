'use client';

import ClaimReportFab from '@/components/assessment/claim-report-fab';
import ScoreDisplay from '@/components/assessment/score-display';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGetAll } from '@/lib/indexeddb';
import { useQuestionnaireTitle } from '@/services/api/questionnaire-info';
import { questionnaireIdOf } from '@/utils/fhir/questionnaire-url';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
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
 * the score display with a shared "Claim Report" CTA for unauthenticated users.
 */
export default function ResultView() {
  const searchParams = useSearchParams();
  const { state: authState, isLoading: authLoading } = useAuth();
  const qrId = searchParams.get('id');

  const [qrData, setQrData] = useState<QuestionnaireResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrId) {
      setLoading(false);
      return;
    }

    /** Loads the draft questionnaire response for the given QR id. */
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

  // Offer the claim CTA only to guests with a loaded response.
  const showClaim =
    !authLoading && !loading && !authState.isAuthenticated && qrData !== null;

  // Resolve the questionnaire title via the shared cache contract.
  const questionnaireId = questionnaireIdOf(qrData?.questionnaire);
  const { data: questionnaireTitle } = useQuestionnaireTitle(questionnaireId);

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
          questionnaireTitle={questionnaireTitle}
        />
      </div>
      <ClaimReportFab path='/record' qrId={qrId} visible={showClaim} />
    </>
  );
}
