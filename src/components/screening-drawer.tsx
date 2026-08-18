'use client';

import { InterviewAccordion } from '@/components/general/home/interview/interview-accordion';
import AppDrawer from '@/components/ui/app-drawer';
import type { InterviewResult } from '@/types/recommendation-interview';
import {
  getAllChiefComplaints,
  saveLastInterviewResult
} from '@/utils/recommendation-interview';
import { ShieldPlus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

interface ScreeningDrawerProps {
  /** Controls drawer visibility (controlled by the parent). */
  open: boolean;
  /** Dismisses the drawer; also fires after a completed screening. */
  onClose: () => void;
  /** Emits the persisted result on completion (e.g. homepage refresh). */
  onComplete?: (result: InterviewResult) => void;
}

/**
 * Unified screening bottom-sheet shared by the FAB and both home views.
 *
 * Wraps the generic `AppDrawer` with a 2-step sequential accordion:
 * chief concern selection → symptom-focus option. On completion it persists
 * the result to IndexedDB, emits it to the parent, closes, and routes to
 * `/recommendation` when the user is not already on the homepage.
 */
export default function ScreeningDrawer({
  open,
  onClose,
  onComplete
}: Readonly<ScreeningDrawerProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const allComplaints = useMemo(() => getAllChiefComplaints(), []);
  const [pendingResult, setPendingResult] = useState<InterviewResult | null>(
    null
  );

  /** Persists the result, emits it, then routes off-page when needed. */
  const handleSubmit = useCallback(
    (result: InterviewResult) => {
      void saveLastInterviewResult(result);
      onComplete?.(result);
      onClose();
      setPendingResult(null);
      // Homepage renders the stack inline; elsewhere go to results (unless
      // already there, which would restart the page).
      if (pathname !== '/' && pathname !== '/recommendation') {
        router.push('/recommendation');
      }
    },
    [onComplete, onClose, pathname, router]
  );

  /** Closes the drawer and resets state. */
  const handleClose = useCallback(() => {
    setPendingResult(null);
    onClose();
  }, [onClose]);

  /** Called by InterviewAccordion when both steps are complete. */
  const handleAccordionComplete = useCallback((result: InterviewResult) => {
    setPendingResult(result);
  }, []);

  /** Primary CTA click — submits the pending result. */
  const handleCtaClick = useCallback(() => {
    if (pendingResult) handleSubmit(pendingResult);
  }, [handleSubmit, pendingResult]);

  /** Always-enabled emergency line handler. */
  const handleEmergencyLine = useCallback(() => {
    window.location.href = 'tel:119';
  }, []);

  return (
    <AppDrawer
      open={open}
      onClose={handleClose}
      title="What's bringing you in today?"
      description='Select a concern to get matched with the right care.'
      ctaLabel='Get Recommendation'
      ctaDisabled={!pendingResult}
      onCtaClick={handleCtaClick}
      footerContent={
        <button
          type='button'
          onClick={handleEmergencyLine}
          className='mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
        >
          <ShieldPlus className='h-4 w-4' />
          Emergency Line
        </button>
      }
    >
      <InterviewAccordion
        options={allComplaints}
        onComplete={handleAccordionComplete}
      />
    </AppDrawer>
  );
}
